import * as vscode from "vscode";
import { Language } from "../../graphql-api/types";
import { getLanguageForDocument } from "../fileUtils";
import { getDependencies as JavascriptGetDependencies } from "./javascript";
import { getDependencies as PhpGetDependencies } from "./php";
import { getDependencies as PythonGetDependencies } from "./python";
import { getDependencies as RubyGetDependencies } from "./ruby";

export async function getDependencies(
  document: vscode.TextDocument
): Promise<string[]> {
  const language: Language = getLanguageForDocument(document);
  switch (language) {
    case Language.Javascript: {
      return await JavascriptGetDependencies();
    }
    case Language.Typescript: {
      return await JavascriptGetDependencies();
    }
    case Language.Php: {
      return await PhpGetDependencies();
    }
    case Language.Python: {
      return await PythonGetDependencies();
    }
    case Language.Ruby: {
      return await RubyGetDependencies();
    }
  }
  return [];
}
