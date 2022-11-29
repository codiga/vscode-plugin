import * as vscode from "vscode";
import { MAX_FILE_SEARCH, ROSIE_SUPPORTED_LANGUAGES } from "../constants";
import { LANGUAGE_TO_EXTENSION } from "../utils/fileUtils";

/**
 * find out if the workspace contains files of
 * languages that rosie supports
 * @returns boolean
 */
export async function isRosieLanguageDetected(): Promise<Boolean> {
  /**
   * get an array of extensions (with the . removed)
   * for all supported rosie languages
   */
  const rosieSupportedExtensions = ROSIE_SUPPORTED_LANGUAGES.reduce(
    (acc, cVal) => {
      return [...acc, ...LANGUAGE_TO_EXTENSION[cVal]];
    },
    [] as string[]
  ).map((extension) => extension.substring(1));

  /**
   * look through the workspace/files to see if
   * it's using a language that codiga/rosie supports
   * TODO - detect which languages are used to
   *        improve ruleset suggestion
   */
  const shouldSuggestCodiga = await vscode.workspace
    .findFiles(
      `**/*.{${rosieSupportedExtensions.join(",")}}`,
      "node_modules",
      MAX_FILE_SEARCH
    )
    .then((files) => files.length === MAX_FILE_SEARCH);

  return shouldSuggestCodiga;
}
