import * as vscode from "vscode";
import { PREFIX_RECENTLY_ADDED_RECIPE } from "../constants";

import { AssistantRecipe, Language } from "../graphql-api/types";
import { filterImports } from "./dependencies/filter-dependencies";
import { firstLineToImport, hasImport } from "./fileUtils";
import {
  adaptIndentation,
  decodeIndent,
  getCurrentIndentation,
} from "./indentationUtils";

/**
 * Utility class to hold what has been already added in the editor.
 */
export interface LatestRecipeHolder {
  recipe: AssistantRecipe | undefined;
  insertedRange: vscode.Range | undefined;
}

/**
 * Reset the values of the recipe holder with undefined. It should
 * be called when we dismissed the coding assistant features (close window, etc.)
 * @param recipeHolder
 */
export const resetRecipeHolder = (recipeHolder: LatestRecipeHolder) => {
  recipeHolder.insertedRange = undefined;
  recipeHolder.recipe = undefined;
};

export const insertSnippet = async (
  editor: vscode.TextEditor,
  initialPosition: vscode.Position,
  recipe: AssistantRecipe,
  language: Language
): Promise<void> => {
  const decodeFromBase64 = Buffer.from(recipe.vscodeFormat, "base64").toString(
    "utf8"
  );
  const decodedCode = decodeIndent(decodeFromBase64);
  const snippet = new vscode.SnippetString(decodedCode);

  /**
   * Filter imports that really need to be added.
   *   1. Refine the imports based on what the editor already has
   *   2. Check if they are already in the editor.
   */
  const filteredImports = filterImports(
    recipe.imports,
    language,
    editor.document
  ).filter((i) => !hasImport(editor.document, i));

  /**
   * Insert the imports at the top of the file.
   */
  await filteredImports.forEach(async (importStatement) => {
    const snippetString = new vscode.SnippetString(importStatement + "\n");
    const line = firstLineToImport(editor.document, language);
    const position = new vscode.Position(line, 0);
    await editor.insertSnippet(snippetString, position);
  });

  /**
   * For each import we have insert, we also need to add another line
   * and compute the final position. We just offset the lines.
   */
  const finalPosition = new vscode.Position(
    initialPosition.line + filteredImports.length,
    initialPosition.character
  );

  editor.insertSnippet(snippet, finalPosition);
};

/**
 * Delete code that was previously added into the editor.
 * @param editor: the current editor
 * @param range: the range to delete
 * @returns
 */
export const deleteInsertedCode = async (
  editor: vscode.TextEditor,
  range: vscode.Range | undefined
): Promise<void> => {
  if (!range) {
    return;
  }

  await editor.edit((editBuilder) => {
    editBuilder.delete(range);
  });
};

/**
 * Add recipe to the editor. It adds at the existing position
 * in the editor. If a recipe was already selected and added
 * before, we remove it.
 * @param editor
 * @param initialPosition
 * @param recipe
 */
export const addRecipeToEditor = async (
  editor: vscode.TextEditor,
  initialPosition: vscode.Position,
  recipe: AssistantRecipe,
  latestRecipeHolder: LatestRecipeHolder
): Promise<void> => {
  const currentIdentation = getCurrentIndentation(editor, initialPosition);
  if (currentIdentation === undefined) {
    return;
  }

  const encodedCode = recipe.presentableFormat;
  const decodeFromBase64 = Buffer.from(encodedCode, "base64").toString("utf8");
  const decodedCode = adaptIndentation(
    decodeIndent(decodeFromBase64),
    currentIdentation
  );
  const decodedCodeLines = decodedCode.split("\n");

  await editor.edit((editBuilder) => {
    /**
     * If a recipe was previously inserted, remove it.
     */
    if (latestRecipeHolder && latestRecipeHolder.insertedRange) {
      editBuilder.delete(latestRecipeHolder.insertedRange);
      resetRecipeHolder(latestRecipeHolder);
    }

    // Get the last inserted line
    const lastInsertedCodeLine =
      decodedCodeLines.length > 0
        ? decodedCodeLines[decodedCodeLines.length - 1]
        : "";

    /**
     * Compute the end position:
     *  - For the line, we take the number of lines from the inserted code
     *  - For the character position
     *    - If the code has only one line, it was not idented by adaptIndentation() and
     *      we need to add the indentation
     *    - If the code has more than one line, we take the length of the last insert code line.
     */
    const endPosition = new vscode.Position(
      initialPosition.line + decodedCodeLines.length - 1,
      decodedCodeLines.length === 1
        ? lastInsertedCodeLine.length + currentIdentation
        : lastInsertedCodeLine.length
    );
    const insertionRange = new vscode.Range(initialPosition, endPosition);
    latestRecipeHolder.recipe = recipe;
    latestRecipeHolder.insertedRange = insertionRange;

    editBuilder.insert(initialPosition, decodedCode);
  });
};

export function generateKeyForUsedRecipe(language: string, shortcut: string) {
  return `${PREFIX_RECENTLY_ADDED_RECIPE}-${language}-${shortcut}`;
}