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
} from "../utils/snippetUtils";
import { showUser } from "../utils/StatusbarUtils";

/**
 * Container to keep the latest recipe so that it can be updated
 * in the generic functions from this file.
 */
const latestRecipeHolder: LatestRecipeHolder = {
  recipe: undefined,
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
      description: `(keywords: ${r.keywords.join(" ")})`,
      recipe: r,
    };
  });
  quickPickEditor.activeItems = [];
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
  const basename: string | undefined = getBasename(relativePath);
  const dependencies: string[] = await getDependencies(doc);
  const initialPosition: vscode.Position = editor.selection.active;

  const quickPick = vscode.window.createQuickPick();
  quickPick.title = "Codiga Coding Assistant";
  quickPick.placeholder = "Enter search terms";
  quickPick.items = [];
  quickPick.canSelectMany = false;
  quickPick.matchOnDescription = true;
  quickPick.onDidChangeValue(async (text) => {
    const latestRecipe = latestRecipeHolder.recipe;
    if (latestRecipe) {
      deleteInsertedCode(editor, initialPosition, latestRecipe);
    }

    await updateQuickpickResults(
      quickPick,
      statusBar,
      text,
      basename,
      language,
      dependencies
    );
  });

  // when changing the selection, add the code to the editor.
  quickPick.onDidAccept(async (e: any) => {
    const selected = quickPick.selectedItems;
    if (selected.length > 0) {
      const firstRecipe: any = selected[0];
      const recipe = firstRecipe.recipe;

      const latestRecipe = latestRecipeHolder.recipe;

      if (latestRecipe) {
        deleteInsertedCode(editor, initialPosition, latestRecipe);
      }
      /**
       * If we select the same recipe, insert it as a snippet
       */
      if (latestRecipe && recipe.id === latestRecipe.id) {
        quickPick.dispose();
        statusBar.hide();

        insertSnippet(editor, initialPosition, recipe, language);
        await useRecipeCallback(latestRecipe.id);
      } else {
        insertSnippet(editor, initialPosition, recipe, language);
      }
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

  // quickPick.onDidAccept((e) => {
  //   console.log("accept");
  // });

  // when hiding, if a recipe was selected, send a callback to
  // notify we want to use it.
  quickPick.onDidHide(async () => {
    const latestRecipe = latestRecipeHolder.recipe;
    if (latestRecipe) {
      deleteInsertedCode(editor, initialPosition, latestRecipe);
    }
    quickPick.dispose();
    statusBar.hide();
  });

  await updateQuickpickResults(
    quickPick,
    statusBar,
    undefined,
    basename,
    language,
    dependencies
  );
  quickPick.show();
}
