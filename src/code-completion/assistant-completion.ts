import * as vscode from "vscode";
import { AssistantRecipe, Language } from "../graphql-api/types";
import {
  getBasename,
  getLanguageForDocument,
  hasImport,
} from "../utils/fileUtils";
import {
  getCurrentIndentationForDocument,
  decodeIndent,
} from "../utils/indentationUtils";
import { getDependencies } from "../utils/dependencies/get-dependencies";
import { getRecipesForClientByShorcut } from "../graphql-api/get-recipes-for-client";
import { DIAGNOSTIC_CODE } from "../constants";
import { getSearchTerm } from "../utils/textUtils";

export async function providesCodeCompletion(
  document: vscode.TextDocument,
  position: vscode.Position
): Promise<vscode.CompletionItem[] | undefined> {
  // get all text until the `position` and check if it reads `console.`
  // and if so then complete if `log`, `warn`, and `error`
  const line = document.lineAt(position);
  const lineText = line.text;

  if (
    !vscode.workspace.getConfiguration().get("codiga.codingAssistantCompletion")
  ) {
    return undefined;
  }

  if (lineText.charAt(position.character - 1) !== ".") {
    return undefined;
  }

  const term = getSearchTerm(lineText, position.character - 1);
  const path = document.uri.path;
  const dependencies: string[] = await getDependencies(document);
  const relativePath = vscode.workspace.asRelativePath(path);
  const language: Language = getLanguageForDocument(document);
  const basename: string | undefined = getBasename(relativePath);
  const recipes: AssistantRecipe[] = await getRecipesForClientByShorcut(
    term,
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
    const decodeFromBase64 = Buffer.from(
      r.vscodeFormat || "",
      "base64"
    ).toString("utf8");

    const decodedCode = decodeIndent(decodeFromBase64);

    // add the shortcut to the list of keywords used to trigger the completion.
    const keywords = r.keywords;
    if (r.shortcut && r.shortcut.length > 0) {
      keywords.push(r.shortcut);
    }

    const title = `${r.shortcut}: ${r.name}`;
    const snippetCompletion = new vscode.CompletionItem(title);

    /**
     * If there is a description, we add it to the snippet. If not, we just
     * show the code.
     */
    if (r.description) {
      snippetCompletion.documentation = new vscode.MarkdownString(
        `${
          r.description
        }\n### Code\n \`\`\`${r.language.toLocaleLowerCase()}\n${decodedCode}\n\`\`\``
      );
    } else {
      snippetCompletion.documentation = new vscode.MarkdownString(
        `\`\`\`${r.language.toLocaleLowerCase()}\n${decodedCode}\n\`\`\``
      );
    }
    snippetCompletion.detail = DIAGNOSTIC_CODE;
    const insertingRange = new vscode.Range(insertionPositionStart, position);
    snippetCompletion.range = insertingRange;

    /**
     * Register this recipe as used
     */
    snippetCompletion.command = {
      arguments: [r.id],
      command: "codiga.registerUsage",
      title: "Codiga Register Usage",
    };

    /**
     * If there is any import to add, we import it
     */
    const importsToUse = r.imports.filter((i) => !hasImport(document, i));
    if (importsToUse.length > 0) {
      const importsCode = importsToUse.join("\n") + "\n";
      const startLineToInsertImports = 0;

      snippetCompletion.additionalTextEdits = [
        vscode.TextEdit.insert(
          new vscode.Position(startLineToInsertImports, 1),
          importsCode
        ),
      ];
    }

    snippetCompletion.insertText = new vscode.SnippetString(decodedCode);

    return snippetCompletion;
  });
}
