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
export const removeStartingSlash = (term: string): string => {
  if (term.length > 2 && term.startsWith("/")) {
    return term.slice(1, term.length);
  }
  return term;
};
