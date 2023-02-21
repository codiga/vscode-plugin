export interface RuleType {
  id: number;
  name: string;
  content: string;
  ruleType: string;
  language: string;
  pattern: string | undefined;
  elementChecked: string | undefined;
}

export interface RulesetType {
  id: number;
  name: string;
  rules: RuleType[];
}

export enum Language {
  Apex = "Apex",
  C = "C",
  Cpp = "Cpp",
  Csharp = "Csharp",
  Css = "Css",
  Coldfusion = "Coldfusion",
  Dart = "Dart",
  Docker = "Docker",
  Go = "Go",
  Haskell = "Haskell",
  Html = "Html",
  Java = "Java",
  Javascript = "Javascript",
  Json = "Json",
  Kotlin = "Kotlin",
  Markdown = "Markdown",
  Objectivec = "Objectivec",
  Perl = "Perl",
  Php = "Php",
  Python = "Python",
  Ruby = "Ruby",
  Rust = "Rust",
  Sass = "Sass",
  Scala = "Scala",
  Scss = "Scss",
  Shell = "Shell",
  Swift = "Swift",
  Solidity = "Solidity",
  Sql = "Sql",
  Terraform = "Terraform",
  Typescript = "Typescript",
  Twig = "Twig",
  Yaml = "Yaml",
  Unknown = "Unknown",
}
