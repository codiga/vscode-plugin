import * as vscode from "vscode";

import { AssistantRecipe, Language } from "../graphql-api/types";
import { filterImports } from "./dependencies/filter-dependencies";
import { firstLineToImport, hasImport } from "./fileUtils";
import {
  adaptIndentation,
  decodeIndent,
  getCurrentIndentation,
} from "./indentationUtils";

export interface LatestRecipeHolder {
  recipe: AssistantRecipe | undefined;
}

export const insertSnippet = (
  editor: vscode.TextEditor,
  initialPosition: vscode.Position,
  recipe: AssistantRecipe,
  language: Language
): void => {
  const decodeFromBase64 = Buffer.from(recipe.vscodeFormat, "base64").toString(
    "utf8"
  );
  const decodedCode = decodeIndent(decodeFromBase64);
  const snippet = new vscode.SnippetString(decodedCode);

  /**
   * Filter imports that really need to be added.
   */
  const filteredImports = filterImports(
    recipe.imports,
    language,
    editor.document
  );

  /**
   * Insert the imports at the top of the file.
   */
  for (const importStatement of filteredImports) {
    if (!hasImport(editor.document, importStatement)) {
      const snippetString = new vscode.SnippetString(importStatement + "\n");
      const line = firstLineToImport(editor.document, language);
      const position = new vscode.Position(line, 0);
      editor.insertSnippet(snippetString, position);
    }
  }

  /**
   * For each import we have insert, we also need to add another line
   * and compute the final position. We just offset the lines.
   */
  const finalPosition = new vscode.Position(
    initialPosition.line + filterImports.length,
    initialPosition.character
  );

  editor.insertSnippet(snippet, finalPosition);
};

/**
 * Delete code that was previously added into the editor
 * @param editor
 * @param initialPosition
 * @param recipe
 * @returns
 */
export const deleteInsertedCode = async (
  editor: vscode.TextEditor,
  initialPosition: vscode.Position,
  recipe: AssistantRecipe | undefined
): Promise<void> => {
  if (!recipe) {
    return;
  }

  const currentIdentation = getCurrentIndentation(editor, initialPosition);

  if (currentIdentation === undefined) {
    return;
  }

  await editor.edit((editBuilder) => {
    const previousDecodeFromBase64 = Buffer.from(
      recipe.presentableFormat || "",
      "base64"
    ).toString("utf8");
    const previousRecipeDecodedCode = adaptIndentation(
      decodeIndent(previousDecodeFromBase64),
      currentIdentation
    );
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

  const latestRecipe = latestRecipeHolder.recipe;

  await editor.edit((editBuilder) => {
    /**
     * If a recipe was previously inserted, remove it.
     */
    if (latestRecipe) {
      const previousDecodeFromBase64 = Buffer.from(
        latestRecipe?.presentableFormat || "",
        "base64"
      ).toString("utf8");
      const previousRecipeDecodedCode = adaptIndentation(
        decodeIndent(previousDecodeFromBase64),
        currentIdentation
      );

      const previousCodeAddedLines = previousRecipeDecodedCode.split("\n");
      const lastLineAdded = previousCodeAddedLines.pop() || "";
      editBuilder.delete(
        new vscode.Range(
          initialPosition,
          new vscode.Position(
            initialPosition.line + previousCodeAddedLines.length,
            previousCodeAddedLines.length > 1
              ? lastLineAdded.length
              : lastLineAdded.length + currentIdentation
          )
        )
      );
    }

    editBuilder.insert(initialPosition, decodedCode);
    latestRecipeHolder.recipe = recipe;
  });
};
