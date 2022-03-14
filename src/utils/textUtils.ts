import { Language } from "../graphql-api/types";

const isCharacterAlphaNumeric = (characterCode: number): boolean => {
  if (
    !(characterCode > 47 && characterCode < 58) && // numeric (0-9)
    !(characterCode > 64 && characterCode < 91) && // upper alpha (A-Z)
    !(characterCode > 96 && characterCode < 123)
  ) {
    // lower alpha (a-z)
    return false;
  }
  return true;
};

export const getSearchTerm = (
  line: string,
  position: number
): string | undefined => {
  let pos = position;
  /**
   * Also include the '/' character as it can be used as
   * a starting character.
   */
  while (
    isCharacterAlphaNumeric(line.charCodeAt(pos)) ||
    line.charAt(pos) === "." ||
    line.charAt(pos) === "/"
  ) {
    pos = pos - 1;
  }

  return line.slice(pos + 1, position + 1);
};

/**
 * Remove the starting / if the term starts with a /
 * removeStartingSlash("foo") returns "foo"
 * removeStartingSlack("/bar") return "bar"
 * @param term
 * @returns
 */
export const removeStartingSlashOrDot = (term: string): string => {
  if (term.length > 2 && term.startsWith("/")) {
    return term.slice(1, term.length);
  }
  if (term.length > 2 && term.startsWith(".")) {
    return term.slice(1, term.length);
  }
  return term;
};

/**
 * Report if we should skip suggesting any code in the suggestions.
 * @param line - the line where we are triggering the suggestion
 * @param element - the element that is being selected
 * @param language - language of the file
 * @returns
 */
export const shouldSkipSuggestions = (
  line: string,
  element: string,
  language: Language
): boolean => {
  if (!line) {
    return true;
  }
  if (line.split(" ").filter((r) => r.length > 0).length > 1) {
    return true;
  }

  /**
   * If the line starts with //, this is a comment and we skip it
   */
  if (line.replace(/\s*/g, "").startsWith("//")) {
    return true;
  }

  /**
   * If the line starts with /*, this is a comment and we skip it
   */
  if (line.replace(/\s*/g, "").startsWith("/*")) {
    return true;
  }

  if (element === "//" || element === "/*") {
    return true;
  }
  return false;
};
