import * as vscode from "vscode";
import { getRecipesForClient } from "../graphql-api/get-recipes-for-client";
import { Language } from "../graphql-api/types";
import { getDependencies } from "../utils/dependencies/get-dependencies";
import { getLanguageForDocument } from "../utils/fileUtils";
import { decodeIndent } from "../utils/indentationUtils";

const inlineCompletionProvider: vscode.InlineCompletionItemProvider<vscode.InlineCompletionItem> =
  {
    provideInlineCompletionItems: async (
      document,
      position,
      _context,
      _token
    ) => {
      const textBeforeCursor = document.getText(
        new vscode.Range(position.with(undefined, 0), position)
      );

      if (textBeforeCursor.trim().startsWith("//")) {
        const textAfterComment = textBeforeCursor.slice(2);

        if (textAfterComment.trim().length > 2) {
          const path = document.uri.path;
          const dependencies: string[] = await getDependencies(document);
          const relativePath = vscode.workspace.asRelativePath(path);
          const language: Language = getLanguageForDocument(document);

          const recipes = await getRecipesForClient(
            textAfterComment.trim(),
            relativePath,
            language,
            dependencies
          );
          
          if (recipes) {
            const items = recipes.map((recipe) => {
              const decodeFromBase64 = Buffer.from(recipe.vscodeFormat, "base64").toString(
                "utf8"
              );
              const decodedCode = decodeIndent(decodeFromBase64);
              const output = `\n// Name: ${recipe.name} Tags: ${recipe.tags}\n${decodedCode}`;

              return {
                text: output,
                range: new vscode.Range(
                  position.translate(0, output.length),
                  position
                ),
              } as vscode.InlineCompletionItem;
            });

            return { items };
          }
        }
      }

      return { items: [] };
    },
  };

export default inlineCompletionProvider;
