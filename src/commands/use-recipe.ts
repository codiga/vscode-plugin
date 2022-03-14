import * as vscode from "vscode";
import { AssistantRecipe, Language } from "../graphql-api/types";
import { getLanguageForDocument, getBasename } from "../utils/fileUtils";
import { getDependencies } from "../utils/dependencies/get-dependencies";
import { getRecipesForClient } from "../graphql-api/get-recipes-for-client";
import { useRecipeCallback } from "../graphql-api/use-recipe";
import {
  addRecipeToEditor,
  deleteInsertedCode,
  insertSnippet,
  LatestRecipeHolder,
  resetRecipeHolder,
} from "../utils/snippetUtils";
import { showUser } from "../utils/StatusbarUtils";
import { CODING_ASSISTANT_WAIT_BEFORE_QUERYING_RESULTS_IN_MS } from "../constants";

/**
 * Container to keep the latest recipe so that it can be updated
 * in the generic functions from this file.
 */
const latestRecipeHolder: LatestRecipeHolder = {
  recipe: undefined,
  insertedRange: undefined,
};

/**
 * Show the list of keywords to show in the list of all recipes
 * @param keywords
 */
const keywordsString = (recipe: AssistantRecipe): string => {
  if (recipe.keywords.length > 0) {
    return `(keywords: ${recipe.keywords.join(" ")})`;
  }
  if (recipe.shortcut && recipe.shortcut.length > 0) {
    return `(shortcut: ${recipe.shortcut})`;
  }

  return "";
};

/**
 * Update the quickpick results by doing a GraphQL query and showing
 * the results.
 * @param quickPickEditor
 * @param statusBar
 * @param keywords
 * @param filename
 * @param language
 * @param dependencies
 * @returns
 */
async function updateQuickpickResults(
  quickPickEditor: vscode.QuickPick<vscode.QuickPickItem>,
  statusBar: vscode.StatusBarItem,
  term: string | undefined,
  filename: string | undefined,
  language: Language,
  dependencies: string[]
) {
  /**
   * Start a request to get all recipes.
   */
  const recipes = await getRecipesForClient(
    term,
    filename,
    language,
    dependencies
  );

  if (!recipes) {
    statusBar.text = "Codiga: no result";
    quickPickEditor.items = [];
    return;
  }

  if (recipes.length === 0) {
    statusBar.text = "Codiga: empty result";
    quickPickEditor.items = [];
    return;
  }

  statusBar.text = `Codiga: ${recipes.length} recipes found`;

  quickPickEditor.items = recipes.map((r) => {
    return {
      label: r.name,
      alwaysShow: true,
      description: keywordsString(r),
      recipe: r,
    };
  });
}

/**
 * Use a Codiga recipe. Main entry point of this command.
 * @returns
 */
export async function useRecipe(
  statusBar: vscode.StatusBarItem
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  statusBar.name = "Codiga";

  await showUser(statusBar);

  /**
   * Get all parameters for the request.
   */
  const doc = editor.document;
  const path = doc.uri.path;
  const relativePath = vscode.workspace.asRelativePath(path);
  const language: Language = getLanguageForDocument(doc);
  const dependencies: string[] = await getDependencies(doc);
  const initialPosition: vscode.Position = editor.selection.active;

  const quickPick = vscode.window.createQuickPick();
  quickPick.title = "Codiga Coding Assistant";
  quickPick.placeholder = "Enter search terms";
  quickPick.items = [];

  quickPick.activeItems = [];
  quickPick.canSelectMany = false;
  quickPick.matchOnDescription = true;

  // Timestamp of the last request change. This is used to avoid hammering
  // the backend with too many requests.
  let lastChangeUpdateRequestInMs = new Date().getTime();

  quickPick.onDidChangeValue(async (text) => {
    quickPick.items = [];
    quickPick.activeItems = [];
    quickPick.busy = true;
    console.log("plop");
    if (latestRecipeHolder && latestRecipeHolder.insertedRange) {
      console.log("delete");
      console.log(latestRecipeHolder.insertedRange);
      await deleteInsertedCode(editor, latestRecipeHolder.insertedRange);
      resetRecipeHolder(latestRecipeHolder);
    }

    // put the last request update change as the current one
    lastChangeUpdateRequestInMs = new Date().getTime();
    const thisRequestChangeInMs = lastChangeUpdateRequestInMs;

    /**
     * Wait for CODING_ASSISTANT_WAIT_BEFORE_QUERYING_RESULTS_IN_MS and
     * check the current request is the latest one.
     */
    const shouldUpdate = await new Promise((r) =>
      setTimeout(() => {
        r(lastChangeUpdateRequestInMs === thisRequestChangeInMs);
      }, CODING_ASSISTANT_WAIT_BEFORE_QUERYING_RESULTS_IN_MS)
    );

    // if not the latest request, there is another one in flight
    if (!shouldUpdate) {
      return;
    }

    await updateQuickpickResults(
      quickPick,
      statusBar,
      text && text.length > 0 ? text : undefined,
      relativePath,
      language,
      dependencies
    );
    quickPick.busy = false;
  });

  // when changing the selection, add the code to the editor.
  quickPick.onDidAccept(async (e: any) => {
    const selected = quickPick.selectedItems;
    if (selected.length > 0) {
      const firstRecipe: any = selected[0];
      const recipe = firstRecipe.recipe;

      const latestRecipe = latestRecipeHolder.recipe;

      if (latestRecipeHolder && latestRecipeHolder.insertedRange) {
        deleteInsertedCode(editor, latestRecipeHolder.insertedRange);
      }
      /**
       * Make sure this is the same as the last recipe and insert it.
       */
      if (latestRecipe && recipe.id === latestRecipe.id) {
        quickPick.dispose();
        statusBar.hide();

        await insertSnippet(editor, initialPosition, recipe, language);
        await useRecipeCallback(latestRecipe.id);
      }

      resetRecipeHolder(latestRecipeHolder);
    }
  });

  /**
   * We change the recipe shown as the user changes the selection
   */
  quickPick.onDidChangeActive(async (e: any) => {
    /**
     * If there is no selected element and a previous
     * recipe inserted, we should remove it.
     */
    if (
      e.length === 0 &&
      latestRecipeHolder &&
      latestRecipeHolder.insertedRange
    ) {
      await deleteInsertedCode(editor, latestRecipeHolder.insertedRange);
      latestRecipeHolder.recipe = undefined;
      resetRecipeHolder(latestRecipeHolder);
    }

    /**
     * If something is shown add it to the editor.
     */
    if (e.length > 0) {
      const recipe = e[0].recipe;

      await addRecipeToEditor(
        editor,
        initialPosition,
        recipe,
        latestRecipeHolder
      );
    }
  });

  // when hiding, if a recipe was selected, send a callback to
  // notify we want to use it.
  quickPick.onDidHide(async () => {
    if (latestRecipeHolder && latestRecipeHolder.insertedRange) {
      deleteInsertedCode(editor, latestRecipeHolder.insertedRange);
    }
    resetRecipeHolder(latestRecipeHolder);
    quickPick.dispose();
    statusBar.hide();
  });

  /**
   * Initial request: show all the existing recipes
   */
  await updateQuickpickResults(
    quickPick,
    statusBar,
    undefined, // no  term to start with
    relativePath,
    language,
    dependencies
  );
  quickPick.show();
}
