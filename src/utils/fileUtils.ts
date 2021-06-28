import { Language } from "../graphql-api/types";
const pathModule = require("path");

const EXTENSION_TO_LANGUAGE: Record<string, Language> = {
  ".cls": Language.Apex,
  ".c": Language.C,
  ".cpp": Language.Cpp,
  ".ts": Language.Typescript,
  ".tsx": Language.Typescript,
  ".dart": Language.Dart,
  ".py": Language.Python,
  ".py3": Language.Python,
  ".go": Language.Go,
  ".php": Language.Php,
  ".php4": Language.Php,
  ".php5": Language.Php,
  ".rb": Language.Ruby,
  ".rs": Language.Rust,
  ".kt": Language.Kotlin,
  ".tf": Language.Terraform,
  ".js": Language.Javascript,
  ".jsx": Language.Javascript,
  ".java": Language.Java,
  ".scala": Language.Scala,
  ".json": Language.Json,
  ".sh": Language.Shell,
  ".yml": Language.Yaml,
  ".yaml": Language.Yaml,
  ".bash": Language.Shell,
};

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
