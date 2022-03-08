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
import { getSearchTerm, removeStartingSlash } from "../utils/textUtils";
import { getShortcutCache } from "../graphql-api/shortcut-cache";

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

  const rawTerm = getSearchTerm(lineText, position.character - 1);
  const path = document.uri.path;
  const dependencies: string[] = await getDependencies(document);
  const relativePath = vscode.workspace.asRelativePath(path);
  const language: Language = getLanguageForDocument(document);
  const basename: string | undefined = getBasename(relativePath);

  if (!rawTerm) {
    return undefined;
  }

  /**
   * Handling starting slash ('/')
   *   - if the slash is added, the search term should be without the starting slash
   *   - we should know if there is a trailing slash and adapt the title later for it so it is selected.
   */
  const term = removeStartingSlash(rawTerm);

  const hasStartingSlash = rawTerm.startsWith("/");

  let recipes: AssistantRecipe[] = [];
  const recipesFromCache = getShortcutCache(basename, language, dependencies);

  /**
   * If we find recipes from the cache, get them and filter
   * using the one that start with the given term.
   * Otherwise, we fetch using the API.
   */
  if (recipesFromCache) {
    recipes = recipesFromCache.filter(
      (r) => r.shortcut && r.shortcut.startsWith(term.toLowerCase())
    );
  } else {
    recipes = await getRecipesForClientByShorcut(
      term,
      basename,
      language,
      dependencies
    );
  }

  const currentIdentation = getCurrentIndentationForDocument(
    document,
    position
  );

  if (currentIdentation === undefined) {
    return undefined;
  }

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

    /**
     * If the user puts a '/', we add it to the title to match the user input.
     */
    const shortcutForTitle = hasStartingSlash ? `/${r.shortcut}` : r.shortcut;
    const title = `${shortcutForTitle}: ${r.name}`;
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
          new vscode.Position(startLineToInsertImports, 0),
          importsCode
        ),
      ];
    }

    snippetCompletion.insertText = new vscode.SnippetString(decodedCode);

    return snippetCompletion;
  });
}
