import * as vscode from "vscode";
import { AssistantRecipe, Language } from "../graphql-api/types";
import { getLanguageForDocument, getBasename } from "../utils/fileUtils";
import { getDependencies } from "../utils/dependencies/get-dependencies";
import { getRecipesForClient } from "../graphql-api/get-recipes-for-client";
import { getUser } from "../graphql-api/user";
import { useRecipeCallback } from "../graphql-api/use-recipe";
import {
  adaptIndentation,
  getCurrentIndentation,
} from "../utils/indentationUtils";

let latestRecipe: AssistantRecipe | undefined;

/**
 * Delete code that was previously added into the editor
 * @param editor
 * @param initialPosition
 * @param recipe
 * @returns
 */
function deleteInsertedCode(
  editor: vscode.TextEditor,
  initialPosition: vscode.Position,
  recipe: AssistantRecipe | undefined
) {
  if (!recipe) {
    return;
  }

  editor.edit((editBuilder) => {
    const previousRecipeDecodedCode = Buffer.from(
      recipe.code || "",
      "base64"
    ).toString("utf8");
    const previousCodeAddedLines = previousRecipeDecodedCode.split("\n");
    const lastLineAdded = previousCodeAddedLines.pop() || "";
    const deleteRange = new vscode.Range(
      initialPosition,
      new vscode.Position(
        initialPosition.line + previousCodeAddedLines.length,
        lastLineAdded.length
      )
    );
    editBuilder.delete(deleteRange);
  });
}

function insertSnippet(
  editor: vscode.TextEditor,
  initialPosition: vscode.Position,
  recipe: AssistantRecipe
) {
  console.log("insert snippet");
  const currentIdentation = getCurrentIndentation(editor, initialPosition);
  const decodedCode = adaptIndentation(
    Buffer.from(recipe.code, "base64").toString("utf8"),
    currentIdentation
  );
  console.log(decodedCode);
  const snippet = new vscode.SnippetString(decodedCode);
  editor.insertSnippet(snippet, initialPosition);
}

/**
 * Add recipe to the editor. It adds at the existing position
 * in the editor.
 * @param editor
 * @param initialPosition
 * @param recipe
 */
function addRecipeToEditor(
  editor: vscode.TextEditor,
  initialPosition: vscode.Position,
  recipe: AssistantRecipe
) {
  const currentIdentation = getCurrentIndentation(editor, initialPosition);

  const encodedCode = recipe.code;
  const decodedCode = adaptIndentation(
    Buffer.from(encodedCode, "base64").toString("utf8"),
    currentIdentation
  );
  if (latestRecipe) {
    editor.edit((editBuilder) => {
      const previousRecipeDecodedCode = adaptIndentation(
        Buffer.from(latestRecipe?.code || "", "base64").toString("utf8"),
        currentIdentation
      );
      const previousCodeAddedLines = previousRecipeDecodedCode.split("\n");
      const lastLineAdded = previousCodeAddedLines.pop() || "";
      const replaceRange = new vscode.Range(
        initialPosition,
        new vscode.Position(
          initialPosition.line + previousCodeAddedLines.length,
          lastLineAdded.length
        )
      );
      editBuilder.replace(replaceRange, decodedCode);
    });
  } else {
    // const snippet = new vscode.SnippetString(decodedCode);
    // editor.insertSnippet(snippet, initialPosition);
    editor.edit((editBuilder) => {
      editBuilder.insert(initialPosition, decodedCode);
    });
  }

  latestRecipe = recipe;
}

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
  keywords: string[],
  filename: string | undefined,
  language: Language,
  dependencies: string[]
) {
  /**
   * Start a request to get all recipes.
   */
  const recipes = await getRecipesForClient(
    keywords,
    filename,
    language,
    dependencies
  );

  if (!recipes) {
    console.info("no result");
    statusBar.text = "Codiga: no result";
    quickPickEditor.items = [];
    return;
  }

  if (recipes.length === 0) {
    console.info("empty result");
    statusBar.text = "Codiga: empty result";
    quickPickEditor.items = [];
    return;
  }

  statusBar.text = `Codiga: ${recipes.length} recipes found`;

  quickPickEditor.items = recipes.map((r) => {
    return {
      label: r.name,
      description: `${r.description} - (${r.keywords.join(",")})`,
      recipe: r,
    };
  });
}

/**
 * Show the user logged in in the status bar.
 */
async function showUser(statusBar: vscode.StatusBarItem) {
  const user = await getUser();
  if (!user) {
    statusBar.text = "Codiga ready (anonymous)";
    statusBar.show();
  } else {
    statusBar.text = `Codiga ready (${user.username})`;
    statusBar.show();
  }
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

  latestRecipe = undefined;
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
    const keywords = text.split(" ");
    if (keywords.length === 0) {
      return "Enter search terms";
    }
    await updateQuickpickResults(
      quickPick,
      statusBar,
      keywords,
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

      /**
       * If we select the same recipe, insert it as a snippet
       */
      if (latestRecipe && recipe.id === latestRecipe.id) {
        quickPick.dispose();
        statusBar.hide();
        //deleteInsertedCode(editor, initialPosition, latestRecipe);
        insertSnippet(editor, initialPosition, recipe);
        await useRecipeCallback(latestRecipe.id);
      } else {
        addRecipeToEditor(editor, initialPosition, recipe);
      }
    }
  });

  /**
   * We change the recipe shown as the user changes the selection
   */
  quickPick.onDidChangeActive((e: any) => {
    if (e.length > 0) {
      const recipe = e[0].recipe;
      addRecipeToEditor(editor, initialPosition, recipe);
    }
  });

  // quickPick.onDidAccept((e) => {
  //   console.log("accept");
  // });

  // when hiding, if a recipe was selected, send a callback to
  // notify we want to use it.
  quickPick.onDidHide(async () => {
    if (latestRecipe) {
      deleteInsertedCode(editor, initialPosition, latestRecipe);
    }
    quickPick.dispose();
    statusBar.hide();
  });

  quickPick.show();
}
