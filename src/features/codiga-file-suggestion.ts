import * as vscode from "vscode";
import {
  CODIGA_RULES_FILE,
  DEFAULT_JAVASCRIPT_RULESET_CONFIG,
  DEFAULT_PYTHON_RULESET_CONFIG,
  INFO_MESSAGE_CODIGA_FILE,
  INFO_MESSAGE_CODIGA_FILE_ACTION_CREATE,
  INFO_MESSAGE_CODIGA_FILE_ACTION_IGNORE,
  INFO_MESSAGE_CODIGA_FILE_KEY,
  ROSIE_SUPPORTED_LANGUAGES,
  VALUE_STRING_TRUE,
} from "../constants";
import { addCreateCodigaYamlRecord } from "../graphql-api/add-create-codiga-yaml-record";
import { Language } from "../graphql-api/types";
import { getWorkspaceRosieLanguage } from "../rosie/rosieUtils";
import getFileUri, { doesFileExist } from "../utils/fileUtils";
import { getFromLocalStorage, setToLocalStorage } from "../utils/localStorage";

export function hasUserIgnoredCodigaSuggestion(): boolean {
  return (
    getFromLocalStorage(INFO_MESSAGE_CODIGA_FILE_KEY) === VALUE_STRING_TRUE
  );
}

export function setUserIgnoreCodigaSuggestion(value: string): void {
  return setToLocalStorage(INFO_MESSAGE_CODIGA_FILE_KEY, value);
}

export function doesCodigaFileExists(): boolean {
  return doesFileExist(CODIGA_RULES_FILE);
}

export function isLanguageRosieSupported(language: Language): boolean {
  return ROSIE_SUPPORTED_LANGUAGES.includes(language);
}

export function getCodigaFileContent(language: Language): string {
  switch (language) {
    case Language.Python:
      return DEFAULT_PYTHON_RULESET_CONFIG;
    case Language.Javascript:
    case Language.Typescript:
      return DEFAULT_JAVASCRIPT_RULESET_CONFIG;
    default:
      return "";
  }
}

export async function createCodigaFile(language: Language): Promise<void> {
  // check if the language is supported before creating a config file
  if (isLanguageRosieSupported(language)) {
    // get the uri for where the file will go
    const codigaUri = getFileUri(CODIGA_RULES_FILE);
    if (codigaUri) {
      const codigaFileContent = Buffer.from(
        getCodigaFileContent(language),
        "utf-8"
      );
      await vscode.workspace.fs.writeFile(codigaUri, codigaFileContent);
      await addCreateCodigaYamlRecord();
    }
  } else {
    throw new Error(`${language} is not supported by Rosie`);
  }
}

/**
 * we should suggest a codiga.yml file for this user's
 * workspace if:
 * - if the workspace contains languages that rosie supports
 * - the user has ignore this warning before
 * - if there's a codiga.yml file present
 */
export async function checkCodigaFileSuggestion() {
  const workspaceLanguage = await getWorkspaceRosieLanguage();
  if (!workspaceLanguage) return;
  if (hasUserIgnoredCodigaSuggestion()) return;
  if (doesCodigaFileExists()) return;

  vscode.window
    .showInformationMessage(
      INFO_MESSAGE_CODIGA_FILE,
      INFO_MESSAGE_CODIGA_FILE_ACTION_CREATE,
      INFO_MESSAGE_CODIGA_FILE_ACTION_IGNORE
    )
    .then(async (selectedItem) => {
      if (selectedItem === INFO_MESSAGE_CODIGA_FILE_ACTION_CREATE) {
        await createCodigaFile(workspaceLanguage);
      }
      if (selectedItem === INFO_MESSAGE_CODIGA_FILE_ACTION_IGNORE) {
        setUserIgnoreCodigaSuggestion(VALUE_STRING_TRUE);
      }
    });
}
