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
  Java = "Java",
  Javascript = "Javascript",
  Shell = "Shell",
  Python = "Python",
  Dart = "Dart",
  Go = "Go",
  Json = "Json",
  Rust = "Rust",
  Typescript = "Typescript",
  C = "C",
  Unknown = "Unknown",
  Yaml = "Yaml",
  Cpp = "Cpp",
  Apex = "Apex",
  Ruby = "Ruby",
  Kotlin = "Kotlin",
  Php = "Php",
  Scala = "Scala",
  Docker = "Docker",
  Terraform = "Terraform",
}
