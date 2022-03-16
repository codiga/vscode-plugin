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

  if (!fs.existsSync(packageFileUri.fsPath)) {
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
