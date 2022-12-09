import * as vscode from "vscode";
import {
  CODIGA_RULES_FILE,
  DEFAULT_PYTHON_RULESET_CONFIG,
  INFO_MESSAGE_CODIGA_FILE,
  INFO_MESSAGE_CODIGA_FILE_ACTION_CREATE,
  INFO_MESSAGE_CODIGA_FILE_ACTION_IGNORE,
  INFO_MESSAGE_CODIGA_FILE_KEY,
  VALUE_STRING_TRUE,
} from "../constants";
import { addCreateCodigaYamlRecord } from "../graphql-api/add-create-codiga-yaml-record";
import { isRosieLanguageDetected } from "../rosie/rosieUtils";
import getFileUri, { doesFileExist } from "./fileUtils";
import { getFromLocalStorage, setToLocalStorage } from "./localStorage";

/**
 * checks whether we should suggest a codiga.yml file
 * for this user's workspace
 */
export async function checkCodigaFileSuggestion() {
  /**
   * check if
   * - the user has ignore this warning before
   * - if there's a codiga.yml file present
   * - if the workspace contains languages that rosie supports
   */
  if (
    getFromLocalStorage(INFO_MESSAGE_CODIGA_FILE_KEY) !== VALUE_STRING_TRUE &&
    !doesFileExist(CODIGA_RULES_FILE) &&
    (await isRosieLanguageDetected())
  ) {
    vscode.window
      .showInformationMessage(
        INFO_MESSAGE_CODIGA_FILE,
        INFO_MESSAGE_CODIGA_FILE_ACTION_CREATE,
        INFO_MESSAGE_CODIGA_FILE_ACTION_IGNORE
      )
      .then(async (selectedItem) => {
        if (selectedItem === INFO_MESSAGE_CODIGA_FILE_ACTION_CREATE) {
          const codigaUri = getFileUri(CODIGA_RULES_FILE);
          if (codigaUri) {
            const codigaFileContent = Buffer.from(
              DEFAULT_PYTHON_RULESET_CONFIG,
              "utf-8"
            );
            await vscode.workspace.fs.writeFile(codigaUri, codigaFileContent);
            await addCreateCodigaYamlRecord();
          }
        }
        if (selectedItem === INFO_MESSAGE_CODIGA_FILE_ACTION_IGNORE) {
          setToLocalStorage(INFO_MESSAGE_CODIGA_FILE_KEY, VALUE_STRING_TRUE);
        }
      });
  }
}
