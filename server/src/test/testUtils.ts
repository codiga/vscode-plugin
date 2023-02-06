import {Rule} from "../rosie/rosieTypes";
import {URI as vsUri, Utils} from 'vscode-uri';
import {TextDocument} from "vscode-languageserver-textdocument";
import {connection} from "../server";
import {MockConnection} from "./connectionMocks";
import {CacheData, CodigaYmlConfig} from "../rosie/rosieCache";
import * as fs from "fs";
import {Position, Range} from "vscode-languageserver";

export const wait = async (ms: number) =>
  new Promise<void>((resolve) => setTimeout(() => resolve(), ms));

/**
 * Creates a codiga.yml file in the current workspace folder with the given content.
 *
 * @param content the file content
 */
export function createCodigaYml(workspaceFolder: vsUri, content: string): vsUri {
  const codigaYaml = Utils.joinPath(workspaceFolder, "codiga.yml");
  const codigaFileContent = Buffer.from(content, "utf-8");
  fs.mkdirSync(workspaceFolder.fsPath);
  fs.writeFileSync(codigaYaml.fsPath, codigaFileContent);
  return codigaYaml;
}

/**
 * Sets the current workspace folder in the language server mock connection.
 */
export function initWorkspaceFolder(workspaceFolder: vsUri) {
  (connection as MockConnection).workspace.workspaceFolders = [{
    name: Utils.dirname(workspaceFolder).path,
    uri: workspaceFolder.path
  }];
}

/**
 * Creates a TextDocument with the argument name, language id and content.
 *
 * Language ids can be found at https://code.visualstudio.com/docs/languages/identifiers#_known-language-identifiers
 *
 * @param fileName the file name
 * @param languageId the language id of the file
 * @param content the content of the file
 */
export function createTextDocument(workspaceFolder: vsUri, fileName: string, languageId: string = "plaintext", content: string = ""): TextDocument {
  return TextDocument.create(
    Utils.joinPath(workspaceFolder, fileName).path, languageId, 1, content);
}

/**
 * Creates a mock AST Rule for the given language with the given content.
 */
export function createMockRule(
  language: string,
  content: string = "",
  rulesetName: string = "mock-ruleset",
  ruleName: string = "mock-rule"
): Rule {
  return {
    rulesetName: rulesetName,
    ruleName: ruleName,
    contentBase64: content,
    entityChecked: null,
    id: `${rulesetName}/${ruleName}`,
    language: language,
    pattern: null,
    type: "ast"
  };
}

/**
 * Convenience method for calling 'createMockRule("", "python", "<ruleset name>", "<rule name>")'
 */
export function createMockPythonRule(
  rulesetName: string = "mock-ruleset",
  ruleName: string = "mock-rule"
): Rule {
  return createMockRule("python", "", rulesetName, ruleName);
}

/**
 * Creates a mock cache data.
 *
 * @param codigaYmlConfig the codiga config the cache data holds
 * @param rules the list of rules to store in the cache data
 */
export function createCacheData(codigaYmlConfig: CodigaYmlConfig, rules: Rule[] = []): CacheData {
  return {
    codigaYmlConfig: codigaYmlConfig,
    rules: rules,
    lastRefreshed: 0,
    lastTimestamp: 1,
    fileLastModification: 0
  };
}

/**
 * Creates a range for the argument start and end line and columns indeces.
 */
export function createRange(startLine: number, startCol: number, endLine: number, endCol: number) {
  return Range.create(Position.create(startLine, startCol), Position.create(endLine, endCol));
}
