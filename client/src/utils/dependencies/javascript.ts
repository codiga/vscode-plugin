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
  if (!fs.existsSync(packageFileUri.fsPath)) {
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
 * Filter all Javascript/Typescript imports and only returns the one that
 * makes sense.
 * @param initialImports
 * @param initialCode
 */
export const filterJavascriptImports = (
  initialImports: string[],
  initialCode: string
): string[] => {
  const importsInitialCode = initialCode
    .split("\n")
    .filter((v) => v.startsWith("import"));
  return initialImports;
};
