import * as fs from "fs";
import * as vscode from "vscode";

import { GEMFILE_FILE } from "../../constants";

/**
 * Read a Gemfile file and return all the dependencies
 * @param gemfileUri
 * @returns
 */
export async function readGemfile(gemfileUri: vscode.Uri): Promise<string[]> {
  const result: string[] = [];
  const re = /\s*gem\s*[\"\']([\w\d\-_]+)[\"\']/;

  if (!fs.existsSync(gemfileUri.path)) {
    return [];
  }

  try {
    const fileContent = await vscode.workspace.fs.readFile(gemfileUri);
    const fileContentString = fileContent.toString();
    const lines = fileContentString.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes("#")) {
        continue;
      }
      const matches = line.match(re);
      if (matches && matches?.length > 1) {
        result.push(matches[1]);
      }
    }
  } catch (err) {
    // noops
  }
  return result;
}
