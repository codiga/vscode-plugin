import { Language } from "../graphql-api/types";
import * as pathModule from 'path';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';
import {getWorkspaceFolders} from "./workspaceCache";

export const EXTENSION_TO_LANGUAGE: Record<string, Language> = {
  ".bash": Language.Shell,
  ".cls": Language.Apex,
  ".c": Language.C,
  ".css": Language.Css,
  ".cs": Language.Csharp,
  ".cpp": Language.Cpp,
  ".cfc": Language.Coldfusion,
  ".cfm": Language.Coldfusion,
  ".dockerfile": Language.Docker,
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

export function asRelativePath(document: TextDocument) {
  const wsFolder = getWorkspaceFolders().filter(folder => document.uri?.startsWith(folder.uri));
  const documentPath = URI.parse(document.uri).path;
  return wsFolder && wsFolder.length === 1
    ? documentPath.replace(URI.parse(wsFolder[0].uri).path, "")
    : documentPath;
}

export function getLanguageForDocument(document: TextDocument): Language {
  return getLanguageForFile(asRelativePath(document));
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
