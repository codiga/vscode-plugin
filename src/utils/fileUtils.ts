import * as fs from "fs";
import * as vscode from "vscode";
import { Language } from "../graphql-api/types";
const pathModule = require("path");

const EXTENSION_TO_LANGUAGE: Record<string, Language> = {
  ".bash": Language.Shell,
  ".cls": Language.Apex,
  ".c": Language.C,
  ".css": Language.Css,
  ".cs": Language.Csharp,
  ".cpp": Language.Cpp,
  ".cfc": Language.Coldfusion,
  ".cfm": Language.Coldfusion,
  ".dart": Language.Dart,
  ".go": Language.Go,
  ".hs": Language.Haskell,
  ".html": Language.Html,
  ".html5": Language.Html,
  ".htm": Language.Html,
  ".java": Language.Java,
  ".json": Language.Json,
  ".js": Language.Javascript,
  ".jsx": Language.Javascript,
  ".kt": Language.Kotlin,
  ".m": Language.Objectivec,
  ".mm": Language.Objectivec,
  ".M": Language.Objectivec,
  ".md": Language.Markdown,
  ".php4": Language.Php,
  ".php5": Language.Php,
  ".php": Language.Php,
  ".ipynb": Language.Python,
  ".py": Language.Python,
  ".py3": Language.Python,
  ".pm": Language.Perl,
  ".pl": Language.Perl,
  ".rs": Language.Rust,
  ".rb": Language.Ruby,
  ".rhtml": Language.Ruby,
  ".sass": Language.Sass,
  ".scala": Language.Scala,
  ".scss": Language.Scss,
  ".sh": Language.Shell,
  ".sol": Language.Solidity,
  ".swift": Language.Swift,
  ".sql": Language.Sql,
  ".tf": Language.Terraform,
  ".ts": Language.Typescript,
  ".tsx": Language.Typescript,
  ".twig": Language.Twig,
  ".yml": Language.Yaml,
  ".yaml": Language.Yaml,
};

/**
 * converts the EXTENSION_TO_LANGUAGE object into:
 * { [Language]: extension-strings[] }
 * used to get all extensions for a language
 */
export const LANGUAGE_TO_EXTENSION = Object.entries(
  EXTENSION_TO_LANGUAGE
).reduce((acc, [extension, language]) => {
  if (acc[language]) {
    acc[language].push(extension);
  } else {
    acc[language] = [extension];
  }
  return acc;
}, {} as { [key in Language]: string[] });

export function getBasename(filename: string): string | undefined {
  const parsedFilename: any = pathModule.parse(filename);
  const basename: string | undefined = parsedFilename.base;
  return basename;
}

export function getLanguageForDocument(
  document: vscode.TextDocument
): Language {
  const path = document.uri.path;
  const relativePath = vscode.workspace.asRelativePath(path);
  return getLanguageForFile(relativePath);
}

export function getLanguageForFile(filename: string): Language {
  const parsedFilename: any = pathModule.parse(filename);
  const basename: string | undefined = parsedFilename.base;
  const extension: string = pathModule.extname(filename).toLowerCase();

  if (basename?.toLowerCase().startsWith("docker")) {
    return Language.Docker;
  }

  if (EXTENSION_TO_LANGUAGE[extension]) {
    return EXTENSION_TO_LANGUAGE[extension];
  }

  return Language.Unknown;
}

/**
 * Check if the document has a specific import.
 * @param document
 * @param importStatement
 * @returns
 */
export function hasImport(
  document: vscode.TextDocument,
  importStatement: string
): boolean {
  const documentText = document.getText();
  const lines = documentText.split("\n");
  return lines.find((l) => l.includes(importStatement)) !== undefined;
}

/**
 * Get the first line to import an import/library statement
 * in a given document for Python
 * @param document
 * @returns
 */
export function firstLineToImportPython(lines: string[]): number {
  let lineNumber = 0;

  for (const line of lines) {
    if (line.startsWith("#") || line.startsWith("import")) {
      lineNumber = lineNumber + 1;
    } else {
      return lineNumber;
    }
  }

  return lineNumber;
}

/**
 *
 * There are different scenarios where we decide how to include imports
 * 1) If there is no comment nor package they're inserted at the top of the file
 * 2) If there is a comment at the top of the file it goes after that comment
 * 3) If there is package definition, it goes after it
 * 4) If there is one comment at the top and there is a space and there is another comment, it goes in between
 * both, because next comment probably is part of the class or function (reason to have foundComment and spaceFound flags)
 * @param lines this is the lines of code
 * @returns line number where the imports should be added
 */
export function firstLineToImportJavaLike(lines: string[]): number {
  let lineNumber = 0;
  let foundComment = false;
  let spaceFound = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (
      line.includes("/*") ||
      line.startsWith("import") ||
      line.includes("*/") ||
      line.includes("*") ||
      line.includes("//")
    ) {
      foundComment = true;
    } else if (line.trim().startsWith("package ")) {
      return i + 1;
    } else if (line.trim() === "") {
      if (foundComment && !spaceFound) {
        lineNumber = i;
        spaceFound = true;
      }
    }
  }

  return lineNumber;
}

/**
 * Get the first line to import an import/library statement
 * in a given document.
 * @param document
 * @param language
 * @returns
 */
export function firstLineToImport(
  document: vscode.TextDocument,
  language: Language
): number {
  const documentText = document.getText();
  const lines = documentText.split("\n");

  if (language === Language.Python) {
    return firstLineToImportPython(lines);
  }

  if (
    language === Language.Javascript ||
    language === Language.Typescript ||
    language === Language.Java
  ) {
    return firstLineToImportJavaLike(lines);
  }

  return 0;
}

export function insertIndentSize(size: number, tabSize: number) {
  return Array(size / tabSize)
    .fill("\t")
    .join("");
}

/**
 * creates a Uri for the given file, if workspaces are present
 * @param fileLocation string - from root
 * @returns vscode.Uri | null
 */
export default function getFileUri(fileLocation: string): vscode.Uri | null {
  const workspaceFolder = vscode.workspace.workspaceFolders;
  /**
   * if no workspaces are open or the length is zero,
   * then the file cannot exist, so we return null
   */
  if (!workspaceFolder || workspaceFolder.length === 0) {
    return null;
  }
  return vscode.Uri.joinPath(workspaceFolder[0].uri, fileLocation);
}

/**
 * checks if a file exists in the location given
 * @param fileLocation string - from root
 * @returns boolean
 */
export function doesFileExist(fileLocation: string): boolean {
  const fileUri = getFileUri(fileLocation);
  if (!fileUri) {
    return false;
  }
  return fs.existsSync(fileUri.fsPath);
}
