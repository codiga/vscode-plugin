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
  while (
    isCharacterAlphaNumeric(line.charCodeAt(pos)) ||
    line.charAt(pos) === "."
  ) {
    pos = pos - 1;
  }

  return line.slice(pos + 1, position + 1);
};
