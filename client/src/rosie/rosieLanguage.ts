import { Language } from "../graphql-api/types";

const LANGUAGE_PYTHON = "python";
const LANGUAGE_JAVASCRIPT = "javascript";
const LANGUAGE_TYPESCRIPT = "typescript";

export const getRosieLanguage = (language: Language): string | undefined => {
  switch (language) {
    case Language.Python:
      return LANGUAGE_PYTHON;
    case Language.Javascript:
      return LANGUAGE_JAVASCRIPT;
    case Language.Typescript:
      return LANGUAGE_TYPESCRIPT;
    default:
      return undefined;
  }
};
