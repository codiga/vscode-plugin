import * as vscode from "vscode";
import { AssistantRecipe, Language } from "../graphql-api/types";
import { getLanguageForDocument, getBasename } from "../utils/fileUtils";
import {
  getCurrentIndentationForDocument,
  adaptIndentation,
} from "../utils/indentationUtils";
import { getDependencies } from "../utils/dependencies/get-dependencies";
import { getRecipesForClient } from "../graphql-api/get-recipes-for-client";
import { DIAGNOSTIC_CODE } from "../constants";

export async function providesCodeCompletion(
  document: vscode.TextDocument,
  position: vscode.Position
): Promise<vscode.CompletionItem[] | undefined> {
  // get all text until the `position` and check if it reads `console.`
  // and if so then complete if `log`, `warn`, and `error`
  const line = document.lineAt(position);
  const keywords = line.text.split(" ").filter((v) => v.length > 0);
  const path = document.uri.path;
  if (keywords.length === 0) {
    return undefined;
  }

  const dependencies: string[] = await getDependencies(document);
  const relativePath = vscode.workspace.asRelativePath(path);
  const language: Language = getLanguageForDocument(document);
  const basename: string | undefined = getBasename(relativePath);
  const recipes: AssistantRecipe[] = await getRecipesForClient(
    keywords,
    basename,
    language,
    dependencies
  );

  const currentIdentation = getCurrentIndentationForDocument(
    document,
    position
  );

  const insertionPositionStart = new vscode.Position(
    position.line,
    currentIdentation
  );

  return recipes.map((r) => {
    const decodedCode = adaptIndentation(
      Buffer.from(r.code || "", "base64").toString("utf8"),
      currentIdentation
    );

    const snippetCompletion = new vscode.CompletionItem(r.name);
    if (r.description) {
      snippetCompletion.documentation = new vscode.MarkdownString(
        `### Description\n${r.description}\n### Code\n \`\`\`python\n${decodedCode}\n\`\`\``
      );
    }
    snippetCompletion.detail = DIAGNOSTIC_CODE;
    const insertingRange = new vscode.Range(insertionPositionStart, position);
    snippetCompletion.range = insertingRange;

    snippetCompletion.insertText = new vscode.SnippetString(decodedCode);
    return snippetCompletion;
  });
}
