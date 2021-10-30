import * as fs from "fs";
import * as vscode from "vscode";

import { REQUIREMENTS_FILE } from "../../constants";

/**
 * Read a requirements file and return all the dependencies
 * @param requirementsFileUri
 * @returns
 */
export async function readRequirementsFile(
  packageFileUri: vscode.Uri
): Promise<string[]> {
  const result: string[] = [];
  const re = /\s*([\w\d\-_]+)/;

  if (!fs.existsSync(packageFileUri.path)) {
    return [];
  }

  try {
    const fileContent = await vscode.workspace.fs.readFile(packageFileUri);

    const fileContentString = fileContent.toString();
    const lines = fileContentString.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes("#")) {
        continue;
      }
      const matches = line.match(re);
      if (matches && matches?.length > 1) {
        result.push(matches[0]);
      }
    }
  } catch (err) {
    // noops
  }
  return result;
}

/**
 * Get the dependencies for the project. Check the folder and if we find
 * a dependency file, return the dependencies.
 * @returns
 */
export async function getDependencies(): Promise<string[]> {
  let workspaceFolders: readonly vscode.WorkspaceFolder[] = [];

  if (vscode.workspace.workspaceFolders) {
    workspaceFolders = vscode.workspace.workspaceFolders;
  }

  for (const folder of workspaceFolders) {
    // Read package.json for nodejs dependencies
    const packageFilePath = vscode.Uri.joinPath(folder.uri, REQUIREMENTS_FILE);
    if (fs.existsSync(packageFilePath.path)) {
      return await readRequirementsFile(packageFilePath);
    }
  }
  return [];
}
