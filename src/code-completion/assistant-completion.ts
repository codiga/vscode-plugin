import * as vscode from "vscode";
import { AssistantRecipe, Language } from "../graphql-api/types";
import {
  firstLineToImport,
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
import {
  getSearchTerm,
  removeStartingSlashOrDot,
  shouldSkipSuggestions,
} from "../utils/textUtils";
import { getShortcutCache } from "../graphql-api/shortcut-cache";
import { filterImports } from "../utils/dependencies/filter-dependencies";
import { getFromLocalStorage } from "../utils/localStorage";
import { generateKeyForUsedRecipe } from "../utils/snippetUtils";

/**
 * Get the recipes. We first attempt to get them from the cache if there
 * is anything in the cache. Otherwise, we get them by making an API
 * query.
 *
 * @param term - the search term
 * @param filename - the filename we are looking for
 * @param language - the language we are using
 * @param dependencies - list of dependencies
 * @returns
 */
const getRecipes = async (
  term: string | undefined,
  filename: string | undefined,
  language: Language,
  dependencies: string[]
): Promise<AssistantRecipe[]> => {
  const recipesFromCache = getShortcutCache(filename, language, dependencies);

  /**
   * If we find recipes from the cache, get them and filter
   * using the one that start with the given term.
   * Otherwise, we fetch using the API.
   */
  if (recipesFromCache) {
    return recipesFromCache.filter((r) => {
      if (term) {
        return r.shortcut && r.shortcut.startsWith(term.toLowerCase());
      } else {
        return r.shortcut !== null;
      }
    });
  } else {
    return await getRecipesForClientByShorcut(
      term,
      filename,
      language,
      dependencies
    );
  }
};

export async function providesCodeCompletion(
  document: vscode.TextDocument,
  position: vscode.Position
): Promise<vscode.CompletionItem[] | undefined> {
  // get all text until the `position` and check if it reads `console.`
  // and if so then complete if `log`, `warn`, and `error`
  const line = document.lineAt(position);
  const lineText = line.text;

  const currentCharacter = lineText.charAt(position.character - 1);
  if (currentCharacter !== "." && currentCharacter !== "/") {
    return undefined;
  }

  const rawTerm = getSearchTerm(lineText, position.character - 1);
  const path = document.uri.path;
  const dependencies: string[] = await getDependencies(document);
  const relativePath = vscode.workspace.asRelativePath(path);
  const language: Language = getLanguageForDocument(document);
  let recipes: AssistantRecipe[] = [];

  if (!rawTerm) {
    return undefined;
  }

  /**
   * If we should skip suggestions, just return and suggest nothing.
   */
  if (shouldSkipSuggestions(lineText, rawTerm, language)) {
    return undefined;
  }

  /**
   * If the rawTerm (what the user wrote) is / or . we should show
   * all recipes. And not do a search.
   */
  if (rawTerm === "/" || rawTerm === ".") {
    recipes = await getRecipes(undefined, relativePath, language, dependencies);
  } else {
    /**
     * Handling starting slash ('/')
     *   - if the slash or dot is added, the search term should be without the starting slash
     *   - we should know if there is a trailing slash and adapt the title later for it so it is selected.
     */
    const term = removeStartingSlashOrDot(rawTerm);

    recipes = await getRecipes(term, relativePath, language, dependencies);
  }

  const hasStartingSlash = rawTerm.startsWith("/");
  const hasStartingDot = rawTerm.startsWith(".");

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
    const decodeVscodeFormatFromBase64 = Buffer.from(
      r.vscodeFormat || "",
      "base64"
    ).toString("utf8");

    const decodePresentableFormatFromBase64 = Buffer.from(
      r.presentableFormat || "",
      "base64"
    ).toString("utf8");

    const vscodeFormatCode = decodeIndent(decodeVscodeFormatFromBase64);

    /**
     * If the user puts a '/', we add it to the title to match the user input.
     */
    const shortcutForTitle = hasStartingSlash
      ? `/${r.shortcut}`
      : hasStartingDot
      ? `.${r.shortcut}`
      : r.shortcut;
    const title = `${shortcutForTitle}: ${r.name}`;
    const snippetCompletion = new vscode.CompletionItem(
      title,
      vscode.CompletionItemKind.Snippet
    );

    /**
     * If there is a description, we add it to the snippet. If not, we just
     * show the code.
     */
    if (r.description) {
      snippetCompletion.documentation = new vscode.MarkdownString(
        `${
          r.description
        }\n### Code\n \`\`\`${r.language.toLocaleLowerCase()}\n${decodePresentableFormatFromBase64}\n\`\`\``
      );
    } else {
      snippetCompletion.documentation = new vscode.MarkdownString(
        `\`\`\`${r.language.toLocaleLowerCase()}\n${decodePresentableFormatFromBase64}\n\`\`\``
      );
    }
    snippetCompletion.detail = DIAGNOSTIC_CODE;
    const insertingRange = new vscode.Range(insertionPositionStart, position);
    snippetCompletion.range = insertingRange;

    /**
     * Register this recipe as used
     */
    snippetCompletion.command = {
      arguments: [r.id, language, r.shortcut],
      command: "codiga.registerUsage",
      title: "Codiga Register Usage",
    };

    /**
     * If there is any import to add, we import it
     */
    const importsToUse = filterImports(r.imports, language, document).filter(
      (i) => !hasImport(document, i)
    );
    if (importsToUse.length > 0) {
      const importsCode = importsToUse.join("\n") + "\n";
      const startLineToInsertImports = firstLineToImport(document, language);

      snippetCompletion.additionalTextEdits = [
        vscode.TextEdit.insert(
          new vscode.Position(startLineToInsertImports, 0),
          importsCode
        ),
      ];
    }

    // When we build a SnippetString with a dollar sign, it's substituted in the text so we escape it.
    const codeWithDollarEscaped = vscodeFormatCode.replace(/\$/g, "\\$");
    snippetCompletion.insertText = new vscode.SnippetString(
      codeWithDollarEscaped
    );

    /* This will suggest recipes that have been used more recently first, for this we use the timestamp
     * stored in the local storage after selecting a suggested recipe and sort them.
     * Because sortText sorts in ascendant order we have to convert timestamps so we sort in descendant order.
     * We add "z" as a default so recipes that have not being used are sorted after previously used recipes by alphanumeric
     * precendence.
     */
    const sortText = getFromLocalStorage(
      generateKeyForUsedRecipe(language, r.shortcut)
    );
    snippetCompletion.sortText = sortText
      ? Array.from(sortText)
          .map((x) => {
            const xNumber = Number(x);

            return (9 - xNumber).toString();
          })
          .join("")
      : "z";

    return snippetCompletion;
  });
}
