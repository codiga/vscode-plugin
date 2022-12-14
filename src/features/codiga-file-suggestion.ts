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
import { rollbarLogger } from "../utils/rollbarUtils";

/**
 * check whether the user has ignored codiga file suggestion for their workspace
 * @returns boolean
 */
export function hasUserIgnoredCodigaSuggestion(): boolean {
  return (
    getFromLocalStorage(INFO_MESSAGE_CODIGA_FILE_KEY) === VALUE_STRING_TRUE
  );
}

/**
 * set whether the user has ignored codiga file suggestions for their workspace
 * @param value "true" || "false"
 */
export function setUserIgnoreCodigaSuggestion(value: "true" | "false"): void {
  setToLocalStorage(INFO_MESSAGE_CODIGA_FILE_KEY, value);
}

/**
 * checks if a codiga.yml file exists in a workspace
 * @returns boolean
 */
export function doesCodigaFileExists(): boolean {
  return doesFileExist(CODIGA_RULES_FILE);
}

/**
 * check if the given language is supported by Rosie
 * @param language
 * @returns boolean
 */
export function isLanguageRosieSupported(language: Language): boolean {
  return ROSIE_SUPPORTED_LANGUAGES.includes(language);
}

/**
 * gets a codiga.yml content for certain languages
 * @param language the main language of the workspace
 * @returns the content for a codiga.yml file
 */

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

/**
 * used to create a codiga.yml file for the given language
 * if the language isn't supported, no file is created
 */
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
    console.log(`${language} is not supported by Rosie`);
    rollbarLogger(`Error: creating codiga.yml`, { language });
  }
}

/**
 * used to remove a codiga.yml file
 */
export async function removeCodigaFile(): Promise<void> {
  const codigaUri = getFileUri(CODIGA_RULES_FILE);
  if (codigaUri) {
    await vscode.workspace.fs.delete(codigaUri);
  }
}

/**
 * checks if we should suggest a language specific codiga file or not for the current workspace
 * @returns the language of the workspace if rosie supports it, otherwise it's undefined
 */
export async function checkWorkspaceToSuggest(): Promise<Language | undefined> {
  const workspaceLanguage = await getWorkspaceRosieLanguage();
  if (!workspaceLanguage) return;
  if (hasUserIgnoredCodigaSuggestion()) return;
  if (doesCodigaFileExists()) return;
  return workspaceLanguage;
}

/**
 * we should suggest a codiga.yml file for this user's
 * workspace if:
 * - if the workspace contains languages that rosie supports
 * - if the user hasn't ignored this warning before
 * - if there's isn't a codiga.yml file present
 */
export async function runCodigaFileSuggestion(): Promise<void> {
  const workspaceLanguage = await checkWorkspaceToSuggest();
  if (!workspaceLanguage) return;

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
