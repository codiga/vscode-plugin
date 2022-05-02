export interface AssistantRecipeOwner {
  id: number;
  username: string;
  accountType: string;
}

export interface AssistantRecipeGroup {
  id: number;
  name: string;
  type: string;
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
  upvotes: number;
  downvotes: number;
  imports: string[];
  shortcut: string;
  vscodeFormat: string;
  presentableFormat: string;
  owner: AssistantRecipeOwner | undefined;
  groups: AssistantRecipeGroup[];
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
