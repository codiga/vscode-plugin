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
