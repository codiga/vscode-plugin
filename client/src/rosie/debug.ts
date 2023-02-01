import * as vscode from "vscode";
import * as fs from "fs";
import { Rule, RuleSet } from "./rosieTypes";
import { CODIGA_RULES_DEBUGFILE } from "../constants";
import { rollbarLogger } from "../utils/rollbarUtils";

/**
 * Get the rules from the rulesets in JSON in the .codigadebug file
 * @param ruleSets
 * @returns
 */
const getRulesFromDebugRulesets = (ruleSets: RuleSet[]): Rule[] => {
  const result: Rule[] = [];

  for (const ruleset of ruleSets) {
    for (const rule of ruleset.rules) {
      result.push(rule);
    }
  }

  return result;
};

export const getRulesDebug = async (
  document: vscode.TextDocument
): Promise<Rule[] | undefined> => {
  const ruleFile = await getRulesFile(document, CODIGA_RULES_DEBUGFILE);

  if (ruleFile) {
    try {
      const debugFileContent = await vscode.workspace.fs.readFile(ruleFile);

      const fileContent = debugFileContent.toString();
      const rulesJson = JSON.parse(fileContent);

      if (!rulesJson) {
        return undefined;
      }
      return getRulesFromDebugRulesets(rulesJson);
    } catch (e) {
      console.debug("error when trying to read the rules");
      rollbarLogger(e);
      return undefined;
    }
  }
  console.log("no ruleset found");
  return undefined;
};

const getRulesFile = async (
  document: vscode.TextDocument,
  filename: string
): Promise<vscode.Uri | undefined> => {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length < 1) {
    return undefined;
  }

  // Get the workspace URI and Path
  const workspaceUri = workspaceFolders[0].uri;
  const workspacePath = workspaceFolders[0].uri.path;

  // Get the document path
  const documentPath = document.uri.path;
  // Find the path of the document relative to the project path
  const pathParths = documentPath.replace(workspacePath, "");

  // Let's have each directory for the parts.
  const parts: string[] | undefined = pathParths.split("/");

  // Let's remove the filename from the parts
  parts.pop();

  // Try each directory until we reach the top directory of the project.
  while (parts && parts.length > 0) {
    const filePath = parts.join("/");
    const potentialFile = vscode.Uri.joinPath(workspaceUri, filePath, filename);
    if (fs.existsSync(potentialFile.fsPath)) {
      return potentialFile;
    }
    parts.pop();
  }

  return undefined;
};
