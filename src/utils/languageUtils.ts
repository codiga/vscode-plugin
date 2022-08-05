export const LANGUAGE_ENUMATION_TO_STRING: Record<string, string> = {
  Shell: "Shell",
  Apex: "Apex",
  C: "C",
  Css: "CSS",
  Csharp: "C#",
  Cpp: "C++",
  Coldfusion: "Coldfusion",
  Dart: "Dart",
  Go: "Go",
  Haskell: "Haskell",
  Html: "HTML",
  Java: "Java",
  Json: "JSON",
  Javascript: "JavaScript",
  Kotlin: "Kotlin",
  Objectivec: "Objective-C",
  Php: "PHP",
  Python: "Python",
  Perl: "Perl",
  Rust: "Rust",
  Ruby: "Ruby",
  Scala: "Scala",
  Solidity: "Solidity",
  Swift: "Swift",
  Sql: "SQL",
  Terraform: "Terraform",
  Typescript: "Typescript",
  Yaml: "YAML",
};

/**
 * Indicate if a line is a comment or not
 * @param line
 * @param language
 * @returns
 */
export const isLineComment = (line: string, language: string): boolean => {
  const filteredLine = line.replace(/\s/g, "");
  switch (language.toLocaleLowerCase()) {
    case "javascript":
    case "typescript":
    case "c":
    case "cpp":
    case "scala":
    case "java":
      return filteredLine.startsWith("//");
    case "python":
    case "shell":
    case "php":
      return filteredLine.startsWith("#");
    case "terraform":
      return filteredLine.startsWith("#") || filteredLine.startsWith("//");
    default:
      return false;
  }
};
