export interface FileAnalysisViolation {
  id: number;
  language: string;
  description: string;
  severity: number;
  category: string;
  filename: string;
  line: number;
  lineCount: number;
  tool: string;
  rule: string;
  ruleUrl: string | undefined;
}

export interface AssistantRecipe {
  id: number;
  name: string;
  description: string;
  language: string;
  isPublic: boolean;
  isGlobal: boolean;
  keywords: string[];
  tags: string[];
  code: string;
  imports: string[];
  shortcut: string;
  vscodeFormat: string;
}

export interface FileAnalysis {
  identifier: number;
  language: string;
  status: string;
  filename: number;
  runningTimeSeconds: number;
  violations: FileAnalysisViolation[];
}

export interface Repository {
  kind: string;
  url: string;
}

export interface Project {
  id: number;
  name: string;
  repository: Repository | undefined;
}

export interface User {
  id: number;
  accountType: string;
  username: string;
}

export enum Language {
  Apex = "Apex",
  C = "C",
  Cpp = "Cpp",
  Csharp = "Csharp",
  Css = "Css",
  Dart = "Dart",
  Docker = "Docker",
  Go = "Go",
  Haskell = "Haskell",
  Html = "Html",
  Java = "Java",
  Javascript = "Javascript",
  Json = "Json",
  Kotlin = "Kotlin",
  Objectivec = "Objectivec",
  Perl = "Perl",
  Php = "Php",
  Python = "Python",
  Ruby = "Ruby",
  Rust = "Rust",
  Scala = "Scala",
  Shell = "Shell",
  Swift = "Swift",
  Solidity = "Solidity",
  Sql = "Sql",
  Terraform = "Terraform",
  Typescript = "Typescript",
  Yaml = "Yaml",
  Unknown = "Unknown",
}
