import * as fs from "fs";
import * as vscode from "vscode";

import { COMPOSER_FILE } from "../../constants";

/**
 * Read a composer file and return all the dependencies
 * @param packageFileUri
 * @returns
 */
export async function readComposerFile(
  packageFileUri: vscode.Uri
): Promise<string[]> {
  const result: string[] = [];

  if (!fs.existsSync(packageFileUri.path)) {
    return [];
  }

  try {
    const composerFile = await vscode.workspace.fs.readFile(packageFileUri);

    const composerFileContent = composerFile.toString();
    const packageContent = JSON.parse(composerFileContent);

    if (packageContent.require) {
      for (const property in packageContent.require) {
        result.push(property);
      }
    }
    if (packageContent["require-dev"]) {
      for (const property in packageContent["require-dev"]) {
        result.push(property);
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
    const packageFilePath = vscode.Uri.joinPath(folder.uri, COMPOSER_FILE);
    if (fs.existsSync(packageFilePath.path)) {
      return await readComposerFile(packageFilePath);
    }
  }
  return [];
}
