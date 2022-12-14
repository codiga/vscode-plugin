import * as vscode from "vscode";
import {
  ROSIE_LANGUAGE_DETECT_MAX_RESULTS,
  ROSIE_SUPPORTED_LANGUAGES,
} from "../constants";
import { Language } from "../graphql-api/types";
import {
  EXTENSION_TO_LANGUAGE,
  LANGUAGE_TO_EXTENSION,
} from "../utils/fileUtils";

/**
 * get the first language that Rosie supports by looking
 * through the workspace/files by file extensions
 * returns null if no matching languages are found
 */
export async function getWorkspaceRosieLanguage(): Promise<Language | null> {
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
   * get the first language that Rosie supports by looking
   * through the workspace/files by file extensions
   */
  return await vscode.workspace
    .findFiles(
      `**/*.{${rosieSupportedExtensions.join(",")}}`,
      "node_modules",
      ROSIE_LANGUAGE_DETECT_MAX_RESULTS
    )
    .then((files) => {
      if (files && files.length === ROSIE_LANGUAGE_DETECT_MAX_RESULTS) {
        const path = files[0].path;
        const extDotIndex = path.lastIndexOf(".");
        const ext = path.substring(extDotIndex);
        const language = EXTENSION_TO_LANGUAGE[ext];
        if (!language) {
          return null;
        } else {
          return language;
        }
      }
      return null;
    });
}
