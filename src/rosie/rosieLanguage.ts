import { Language } from "../graphql-api/types";

const LANGUAGE_PYTHON = "python";

export const getRosieLanguage = (lang: Language): string | undefined => {
  if (lang === Language.Python) {
    return LANGUAGE_PYTHON;
  }
  return undefined;
};
