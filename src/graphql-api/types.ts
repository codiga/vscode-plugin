export interface AssistantRecipeOwner {
  id: number;
  displayName: string;
  accountType: string;
  hasSlug: boolean;
  slug: string | undefined;
}

export interface AssistantRecipeGroup {
  id: number;
  name: string;
  type: string;
}

export interface Cookbook {
  id: number;
  isSubscribed: boolean;
  name: string;
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
  isSubscribed: boolean;
  shortcut: string;
  vscodeFormat: string;
  presentableFormat: string;
  owner: AssistantRecipeOwner;
  groups: AssistantRecipeGroup[];
  cookbook: Cookbook | undefined;
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
