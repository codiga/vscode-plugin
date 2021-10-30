import * as vscode from "vscode";
import * as fs from "fs";
import { Language } from "../../graphql-api/types";
import { getLanguageForDocument } from "../fileUtils";
import { readPackageFile } from "./javascript";
import { readComposerFile } from "./php";
import { readRequirementsFile } from "./python";
import { readGemfile } from "./ruby";
import {
  COMPOSER_FILE,
  GEMFILE_FILE,
  NODE_PACKAGE_FILE,
  REQUIREMENTS_FILE,
} from "../../constants";

/**
 * Search for a given filename in the project, read it
 * and return all the dependencies.
 * @param filename - the filename to look for
 * @param functionToExecute - the function to execute.
 * @returns
 */
export async function getDependenciesFromProject(
  filename: string,
  functionToExecute: (fileUri: vscode.Uri) => Promise<string[]>
): Promise<string[]> {
  let workspaceFolders: readonly vscode.WorkspaceFolder[] = [];

  if (vscode.workspace.workspaceFolders) {
    workspaceFolders = vscode.workspace.workspaceFolders;
  }

  for (const folder of workspaceFolders) {
    // Read package.json for nodejs dependencies
    const dependencyFile = vscode.Uri.joinPath(folder.uri, filename);
    if (fs.existsSync(dependencyFile.path)) {
      return await functionToExecute(dependencyFile);
    }
  }
  return [];
}

/**
 * Get dependencies for a document. Get the directory that contains
 * the dependency files, read it and return its list.
 * @param document - the document we are inspecting.
 * @returns
 */
export async function getDependencies(
  document: vscode.TextDocument
): Promise<string[]> {
  const language: Language = getLanguageForDocument(document);
  switch (language) {
    case Language.Javascript: {
      return await getDependenciesFromProject(
        NODE_PACKAGE_FILE,
        readPackageFile
      );
    }
    case Language.Typescript: {
      return await getDependenciesFromProject(
        NODE_PACKAGE_FILE,
        readPackageFile
      );
    }
    case Language.Php: {
      return await getDependenciesFromProject(COMPOSER_FILE, readComposerFile);
    }
    case Language.Python: {
      return await getDependenciesFromProject(
        REQUIREMENTS_FILE,
        readRequirementsFile
      );
    }
    case Language.Ruby: {
      return await getDependenciesFromProject(GEMFILE_FILE, readGemfile);
    }
  }
  return [];
}
