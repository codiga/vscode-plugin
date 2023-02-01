import * as vscode from "vscode";
import { Language } from "../graphql-api/types";
import { getLanguageForDocument } from "../utils/fileUtils";

/**
 * Create a recipe by redirecting the user to the recipe creation
 * page. Get the text, encode it in base64 and call the browser
 * to show the recipe.
 */
export async function createRecipe(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    const selection = editor.selection;
    const text = editor.document.getText(selection);
    const language: Language = getLanguageForDocument(editor.document);
    const base64 = Buffer.from(text, "utf8").toString("base64");
    // we need to replace the `+` character when creating a recipe by %2B
    // to make sure the URL parameters are correctly encoded.
    const code = base64.replace(/\+/g, "%2B");
    const url = `https://app.codiga.io/assistant/recipe/create?code=${code}&language=${language}`;
    vscode.env.openExternal(vscode.Uri.parse(url));
  }
}
