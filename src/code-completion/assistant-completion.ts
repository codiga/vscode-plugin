import * as vscode from "vscode";
import { AssistantRecipe, Language } from "../graphql-api/types";
import {
  getBasename,
  getLanguageForDocument,
  hasImport,
} from "../utils/fileUtils";
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
  const lineText = line.text;

  /**
   * Do not trigger if we are in the middle of some code
   */
  if (
    lineText.includes(")") ||
    lineText.includes("(") ||
    lineText.includes(".") ||
    lineText.includes(";")
  ) {
    return undefined;
  }

  /**
   * if we are before the end of the line, we are triggered only if there are only space after the cursor.
   * so if we are on a line and there are non-space characers after us, we do not trigger
   * a request.
   */
  if (lineText.length > position.character) {
    for (let i = position.character - 1; i < lineText.length; i++) {
      const c = lineText.charAt(i);
      if (c !== " ") {
        return undefined;
      }
    }
  }

  const keywords = lineText.split(" ").filter((v) => v.length > 0);
  console.log(keywords);
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
    const decodedCode = Buffer.from(r.vscodeFormat || "", "base64").toString(
      "utf8"
    );
    const importsCode = r.imports
      .filter((i) => !hasImport(document, i))
      .join("\n");
    const importsCodeFinal =
      importsCode.length > 0 ? importsCode + "\n" : importsCode;

    const decodedCodeWithImport = importsCodeFinal + decodedCode;
    const decodedCodeWithIndentation = adaptIndentation(
      decodedCodeWithImport,
      currentIdentation
    );

    // add the shortcut to the list of keywords used to trigger the completion.
    const keywords = r.keywords;
    console.log(r.shortcut);
    if (r.shortcut && r.shortcut.length > 0) {
      keywords.push(r.shortcut);
    }

    const title = `${r.name} (${r.keywords.join(" ")})`;
    const snippetCompletion = new vscode.CompletionItem(title);
    if (r.description) {
      snippetCompletion.documentation = new vscode.MarkdownString(
        `${r.description}\n### Code\n \`\`\`python\n${decodedCode}\n\`\`\``
      );
    }
    snippetCompletion.detail = DIAGNOSTIC_CODE;
    const insertingRange = new vscode.Range(insertionPositionStart, position);
    snippetCompletion.range = insertingRange;

    snippetCompletion.insertText = new vscode.SnippetString(
      decodedCodeWithIndentation
    );
    return snippetCompletion;
  });
}
