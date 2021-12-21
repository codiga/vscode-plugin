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
  ".php4": Language.Php,
  ".php5": Language.Php,
  ".php": Language.Php,
  ".py": Language.Python,
  ".py3": Language.Python,
  ".pm": Language.Perl,
  ".pl": Language.Perl,
  ".rs": Language.Rust,
  ".rb": Language.Ruby,
  ".rhtml": Language.Ruby,
  ".scala": Language.Scala,
  ".scss": Language.Css,
  ".sh": Language.Shell,
  ".sol": Language.Solidity,
  ".swift": Language.Swift,
  ".sql": Language.Sql,
  ".tf": Language.Terraform,
  ".ts": Language.Typescript,
  ".tsx": Language.Typescript,
  ".yml": Language.Yaml,
  ".yaml": Language.Yaml,
};

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
  let lineNumber = 0;

  for (const line in lines) {
    if (language === Language.Python) {
      if (line.startsWith("#") || line.startsWith("import")) {
        lineNumber = lineNumber + 1;
      }
    }
    if (language === Language.Javascript || language === Language.Typescript) {
      if (
        line.includes("/*") ||
        line.startsWith("import") ||
        line.includes("*/") ||
        line.includes("*")
      ) {
        lineNumber = lineNumber + 1;
      }
    }
  }
  return lineNumber;
}

export function insertIndentSize (size: number, tabSize: number) {
  return Array(size / tabSize).fill('\t').join('');
}
