/**
 * Get the comment sign for a language
 * @param line
 * @param language
 * @returns
 */
export const getCommentSign = (language: string): string => {
  switch (language.toLocaleLowerCase()) {
    case "javascript":
    case "typescript":
    case "c":
    case "apex":
    case "cpp":
    case "scala":
    case "dart":
    case "go":
    case "objective-c":
    case "kotlin":
    case "java":
    case "swift":
    case "solidity":
    case "rust":
    case "sass":
    case "scss":
      return "//";
    case "python":
    case "shell":
    case "perl":
    case "yaml":
      return "#";
    case "coldfusion":
      return "<!---";
    case "haskell":
      return "--";
    case "twig":
      return "{#";
    default:
      return "//";
  }
};
