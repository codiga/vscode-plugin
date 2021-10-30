import * as fs from "fs";
import * as vscode from "vscode";

import { NODE_PACKAGE_FILE } from "../../constants";

/**
 * Read a package file and return all the dependencies
 * @param packageFileUri
 * @returns
 */
export async function readPackageFile(
  packageFileUri: vscode.Uri
): Promise<string[]> {
  const result: string[] = [];
  console.log(packageFileUri.path);
  if (!fs.existsSync(packageFileUri.path)) {
    return [];
  }

  try {
    const packageFile = await vscode.workspace.fs.readFile(packageFileUri);

    const packageFileContent = packageFile.toString();
    const packageContent = JSON.parse(packageFileContent);

    /**
     * If there is nothing in the package content, just return.
     */
    if (!packageContent || !packageContent.dependencies) {
      return [];
    }

    for (const property in packageContent.dependencies) {
      result.push(property);
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
    const packageFilePath = vscode.Uri.joinPath(folder.uri, NODE_PACKAGE_FILE);
    if (fs.existsSync(packageFilePath.path)) {
      return await readPackageFile(packageFilePath);
    }
  }
  return [];
}
