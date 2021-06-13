import { Language } from "../graphql/types";
const pathModule = require("path");

const EXTENSION_TO_LANGUAGE: Record<string, Language> = {
  ".cls": Language.Apex,
  ".c": Language.C,
  ".cpp": Language.Cpp,
  ".ts": Language.Typescript,
  ".py": Language.Python,
  ".py3": Language.Python,
  ".php": Language.Php,
  ".rb": Language.Ruby,
  ".tf": Language.Terraform,
  ".js": Language.Javascript,
  ".jsx": Language.Javascript,
  ".java": Language.Java,
  ".scala": Language.Scala,
  ".sh": Language.Shell,
  ".bash": Language.Shell,
};

export function getLanguageForFile(filename: string): Language {
  const parsedFilename: any = pathModule.parse(filename);
  const basename: string | undefined = parsedFilename.base;
  const extension = pathModule.extname(filename);

  if (basename?.toLowerCase().startsWith("docker")) {
    return Language.Docker;
  }

  if (EXTENSION_TO_LANGUAGE[extension]) {
    return EXTENSION_TO_LANGUAGE[extension];
  }

  return Language.Unknown;
}
