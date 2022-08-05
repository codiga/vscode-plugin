import * as vscode from "vscode";
import {
  isInlineCompletionEnabled,
  snippetVisibilityOnlyPrivate,
  snippetVisibilityOnlyPublic,
  snippetVisibilityOnlySubscribed,
} from "../graphql-api/configuration";
import { getRecipesForClient } from "../graphql-api/get-recipes-for-client";
import { Language } from "../graphql-api/types";
import { getDependencies } from "../utils/dependencies/get-dependencies";
import { getLanguageForDocument } from "../utils/fileUtils";
import { decodeIndent } from "../utils/indentationUtils";
import { isLineComment } from "../utils/languageUtils";

export const cleanLine = (line: string): string => {
  return line.replace("#", "").replace("//", "");
};

export const provideInlineComplextion = async (
  document: vscode.TextDocument,
  position: vscode.Position,
  context: vscode.InlineCompletionContext,
  token: vscode.CancellationToken
): Promise<vscode.InlineCompletionItem[] | vscode.InlineCompletionList> => {
  if (!isInlineCompletionEnabled()) {
    console.log("disabled");
    return Promise.resolve([]);
  }
  if (position.line <= 0) {
    return Promise.resolve([]);
  }

  const currentLine = document.lineAt(position.line).text;
  const term = currentLine;
  const language: Language = getLanguageForDocument(document);
  const filename = vscode.workspace.asRelativePath(document.uri.path);
  const dependencies: string[] = await getDependencies(document);

  if (!isLineComment(term, language)) {
    return [];
  }

  const snippets = await getRecipesForClient(
    cleanLine(term),
    filename,
    language,
    dependencies,
    snippetVisibilityOnlyPublic(),
    snippetVisibilityOnlyPrivate(),
    snippetVisibilityOnlySubscribed()
  );

  return snippets.slice(0, 5).map((snippet) => {
    const decodeVscodeFormatFromBase64 = Buffer.from(
      snippet.vscodeFormat || "",
      "base64"
    ).toString("utf8");
    const vscodeFormatCode = decodeIndent(decodeVscodeFormatFromBase64);
    const replacingRange = new vscode.Range(
      new vscode.Position(position.line, 0),
      new vscode.Position(position.line, position.character)
    );
    return new vscode.InlineCompletionItem(
      new vscode.SnippetString("\n" + vscodeFormatCode),
      undefined,
      {
        arguments: [snippet, document, position.line],
        command: "codiga.cleanLineAndRegisterUsage",
        title: "clean line",
      }
    );
  });
};
