import * as vscode from "vscode";
import { AssistantRecipe, Language } from "../graphql-api/types";
import { getLanguageForDocument, getBasename } from "../utils/fileUtils";
import { getDependencies } from "../utils/dependencies/get-dependencies";
import { getRecipesForClientByShorcut } from "../graphql-api/get-recipes-for-client";
import { useRecipeCallback } from "../graphql-api/use-recipe";
import {
  addRecipeToEditor,
  deleteInsertedCode,
  insertSnippet,
  LatestRecipeHolder,
  resetRecipeHolder,
} from "../utils/snippetUtils";
import { showUser } from "../utils/StatusbarUtils";

const latestRecipeHolder: LatestRecipeHolder = {
  recipe: undefined,
  insertedRange: undefined,
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
async function fetchShortcuts(
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
  const recipesFromBackend = await getRecipesForClientByShorcut(
    undefined,
    filename,
    language,
    dependencies
  );

  const recipes = recipesFromBackend;

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
      label: `${r.shortcut}: ${r.name}`,
      alwaysShow: true,
      description: r.description,
      recipe: r,
    };
  });
  quickPickEditor.activeItems = [];
}

/**
 * Use a Codiga recipe. Main entry point of this command.
 * @returns
 */
export async function listShorcuts(
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
  quickPick.title = "Codiga Cheat Sheet";
  quickPick.placeholder = "Enter search terms";
  quickPick.items = [];
  quickPick.canSelectMany = false;
  quickPick.matchOnDescription = true;
  quickPick.onDidChangeValue(async (text) => {
    if (latestRecipeHolder.insertedRange) {
      deleteInsertedCode(editor, latestRecipeHolder.insertedRange);
    }
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
       * If we select the same recipe, insert it as a snippet
       */
      if (latestRecipe && recipe.id === latestRecipe.id) {
        quickPick.dispose();
        statusBar.hide();
        await insertSnippet(editor, initialPosition, recipe, language);
      } else {
        await insertSnippet(editor, initialPosition, recipe, language);
      }
      await useRecipeCallback(recipe.id);
      resetRecipeHolder(latestRecipeHolder);
    }
  });

  /**
   * We change the recipe shown as the user changes the selection
   */
  quickPick.onDidChangeActive((e: any) => {
    if (e.length > 0) {
      const recipe = e[0].recipe;
      addRecipeToEditor(editor, initialPosition, recipe, latestRecipeHolder);
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

  quickPick.busy = true;

  await fetchShortcuts(
    quickPick,
    statusBar,
    undefined,
    relativePath,
    language,
    dependencies
  );

  quickPick.busy = false;

  quickPick.show();
}
