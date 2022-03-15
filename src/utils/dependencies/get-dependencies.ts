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
 * Search from the top of the project a dependency file and walk backwards to the
 * root of the project. Return nothing if no dependency is found.
 * @param document - the current document being edited.
 * @param filename - the filename to look for
 * @param functionToExecute - the function to execute.
 * @returns
 */
export async function getDependenciesFromProject(
  document: vscode.TextDocument,
  filename: string,
  functionToExecute: (fileUri: vscode.Uri) => Promise<string[]>
): Promise<string[]> {
  const workspaceFolders = vscode.workspace.workspaceFolders;

  if (!workspaceFolders || workspaceFolders.length < 1) {
    return [];
  }

  // Get the workspace URI and Path
  const workspaceUri = workspaceFolders[0].uri;
  const workspacePath = workspaceFolders[0].uri.path;

  // Get the document path
  const documentPath = document.uri.path;
  // Find the path of the document relative to the project path
  const pathParths = documentPath.replace(workspacePath, "");

  // Let's have each directory for the parts.
  let parts: string[] | undefined = pathParths.split("/");

  // Let's remove the filename from the parts
  parts.pop();

  // Try each directory until we reach the top directory of the project.
  while (parts && parts.length > 0) {
    const filePath = parts.join("/");
    const potentialDependencyFile = vscode.Uri.joinPath(
      workspaceUri,
      filePath,
      filename
    );
    if (fs.existsSync(potentialDependencyFile.path)) {
      return await functionToExecute(potentialDependencyFile);
    }
    parts.pop();
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
        document,
        NODE_PACKAGE_FILE,
        readPackageFile
      );
    }
    case Language.Typescript: {
      return await getDependenciesFromProject(
        document,
        NODE_PACKAGE_FILE,
        readPackageFile
      );
    }
    case Language.Php: {
      return await getDependenciesFromProject(
        document,
        COMPOSER_FILE,
        readComposerFile
      );
    }
    case Language.Python: {
      return await getDependenciesFromProject(
        document,
        REQUIREMENTS_FILE,
        readRequirementsFile
      );
    }
    case Language.Ruby: {
      return await getDependenciesFromProject(
        document,
        GEMFILE_FILE,
        readGemfile
      );
    }
  }
  return [];
}
