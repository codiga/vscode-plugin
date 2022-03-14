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
  editor.insertSnippet(snippet, initialPosition);

  for (const importStatement of filterImports(
    recipe.imports,
    language,
    editor.document
  )) {
    if (!hasImport(editor.document, importStatement)) {
      const snippetString = new vscode.SnippetString(importStatement + "\n");
      const line = firstLineToImport(editor.document, language);
      const position = new vscode.Position(line, 0);
      editor.insertSnippet(snippetString, position);
    }
  }
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
      recipe.vscodeFormat || "",
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

  const encodedCode = recipe.vscodeFormat;
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
        latestRecipe?.vscodeFormat || "",
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
            lastLineAdded.length
          )
        )
      );
    }

    editBuilder.insert(initialPosition, decodedCode);
    latestRecipeHolder.recipe = recipe;
  });
};
