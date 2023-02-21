import * as vscode from "vscode";
import { Language } from "../../graphql-api/types";
import { filterJavascriptImports } from "./javascript";

/**
 * Filter imports for a document.
 * @param document - the document we are inspecting.
 * @param initialImports - list of initial imports
 * @returns
 */
export function filterImports(
  initialImports: string[],
  language: Language,
  document: vscode.TextDocument
): string[] {
  return initialImports;
  // const documentText = document.getText();
  // switch (language) {
  //   case Language.Javascript: {
  //     filterJavascriptImports(initialImports, documentText);
  //   }
  //   default: {
  //     return initialImports;
  //   }
  // }
}
