import * as vscode from "vscode";
import { AssistantRecipe, Language } from "../graphql-api/types";
import { getLanguageForDocument, getBasename } from "../utils/fileUtils";
import { getDependencies } from "../utils/dependencies/get-dependencies";
import { getRecipesForClient } from "../graphql-api/get-recipes-for-client";
import { useRecipeCallback } from "../graphql-api/use-recipe";

/**
 * Quick use of a recipe. If the user touches escape in the dialog box,
 * we need to remove the text.
 * @returns
 */
export async function useRecipeQuick(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    /**
     * Get all parameters for the request.
     */

    const doc = editor.document;
    const path = doc.uri.path;
    const relativePath = vscode.workspace.asRelativePath(path);
    const language: Language = getLanguageForDocument(doc);
    const basename: string | undefined = getBasename(relativePath);
    const dependencies: string[] = await getDependencies(doc);

    let latestRecipe: AssistantRecipe | undefined;
    const initialPosition: vscode.Position = editor.selection.active;

    const res = await vscode.window.showInputBox({
      placeHolder: "Search query terms",
      title: "Codiga Recipe - Quick Usage",
      prompt: "Enter what you want to do (e.g. read a file line by line)",
      validateInput: async (text: string): Promise<string | undefined> => {
        /**
         * Let's make sure there is something to search for first.
         */
        if (text.length === 0) {
          return "Enter search terms";
        }

        const keywords = text.split(" ");
        if (keywords.length === 0) {
          return "Enter search terms";
        }

        /**
         * Start a request to get all recipes.
         */
        const recipes = await getRecipesForClient(
          keywords,
          basename,
          language,
          dependencies
        );

        if (recipes) {
          /**
           * If no recipe, nothing to show and just return.
           */
          if (recipes.length === 0) {
            return "no recipe found";
          }
          const recipe: AssistantRecipe = recipes[0];
          const encodedCode = recipe.code;
          const decodedCode = Buffer.from(encodedCode, "base64").toString(
            "utf8"
          );

          /**
           * If the recipe found is the same than the previous one, let's not edit.
           */
          if (recipe.id === latestRecipe?.id) {
            console.log("same recipe, not editing");
            return;
          }

          if (latestRecipe) {
            editor.edit((editBuilder) => {
              const previousRecipeDecodedCode = Buffer.from(
                latestRecipe?.code || "",
                "base64"
              ).toString("utf8");
              const previousCodeAddedLines =
                previousRecipeDecodedCode.split("\n");
              const lastLineAdded = previousCodeAddedLines.pop() || "";
              const replaceRange = new vscode.Range(
                initialPosition,
                new vscode.Position(
                  initialPosition.line + previousCodeAddedLines.length,
                  lastLineAdded.length
                )
              );
              editBuilder.replace(replaceRange, decodedCode);
            });
          } else {
            editor.edit((editBuilder) => {
              editBuilder.insert(initialPosition, decodedCode);
            });
          }

          latestRecipe = recipe;
        }
      },
    });

    /**
     * If there is a recipe selected, res is defined. If the user
     * presses escape, we need to remove the text.
     */
    if (res) {
      if (latestRecipe) {
        useRecipeCallback(latestRecipe.id);
      }
    } else {
      editor.edit((editBuilder) => {
        const previousRecipeDecodedCode = Buffer.from(
          latestRecipe?.code || "",
          "base64"
        ).toString("utf8");
        const previousCodeAddedLines = previousRecipeDecodedCode.split("\n");
        const lastLineAdded = previousCodeAddedLines.pop() || "";
        const replaceRange = new vscode.Range(
          initialPosition,
          new vscode.Position(
            initialPosition.line + previousCodeAddedLines.length,
            lastLineAdded.length
          )
        );
        editBuilder.delete(replaceRange);
      });
    }
  }
}
