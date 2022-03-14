import * as vscode from "vscode";
import { AssistantRecipe } from "../../graphql-api/types";
import { decodeIndent } from "../../utils/indentationUtils";
import os = require("os");
export const testDataFolderCodeCompletion = "/code-completion/testdata/";

export const documentRecipeExpected =
  "use std::thread;" +
  os.EOL +
  "thread::spawn(move || {" +
  os.EOL +
  "  // thread code here" +
  os.EOL +
  "});";
export const documentRecipeIndentExpectedWithFourSpaces = decodeIndent(
  "use std::thread;" +
    os.EOL +
    "thread::spawn(move || {" +
    os.EOL +
    "    // thread code here" +
    os.EOL +
    "});"
);
export const documentRecipeIndentExpectedWithTwoSpaces = decodeIndent(
  "use std::thread;" +
    os.EOL +
    "thread::spawn(move || {" +
    os.EOL +
    "  // thread code here" +
    os.EOL +
    "});"
);

export const documentRecipeIndentExpectedWithTabs = decodeIndent(
  "use std::thread;" +
    os.EOL +
    "thread::spawn(move || {" +
    os.EOL +
    "\t// thread code here" +
    os.EOL +
    "});"
);

export const recipeWithIndentVariable =
  "dGhyZWFkOjpzcGF3bihtb3ZlIHx8IHsKJltDT0RJR0FfSU5ERU5UXS8vIHRocmVhZCBjb2RlIGhlcmUKfSk7";
export const recipeWithTransformVariables =
  "dGhyZWFkOjpzcGF3bihtb3ZlIHx8IHsKICAvLyB0aHJlYWQgY29kZSBoZXJlCiAgJHtUTV9TRUxFQ1RFRF9URVhUfQogICR7VE1fQ1VSUkVOVF9MSU5FfQogICR7VE1fQ1VSUkVOVF9XT1JEfQogICR7VE1fTElORV9JTkRFWH0KICAke1RNX0xJTkVfTlVNQkVSfQogICR7VE1fRklMRU5BTUV9CiAgJHtUTV9GSUxFTkFNRV9CQVNFfQogICR7VE1fRElSRUNUT1JZfQogICR7VE1fRklMRVBBVEh9CiAgJHtSRUxBVElWRV9GSUxFUEFUSH0KICAke0NMSVBCT0FSRH0KICAke1dPUktTUEFDRV9OQU1FfQogICR7V09SS1NQQUNFX0ZPTERFUn0KICAke0NVUlJFTlRfREFZX05BTUV9CiAgJHtDVVJSRU5UX01PTlRIX05BTUV9CiAgJHtDVVJSRU5UX0RBWV9OQU1FX1NIT1JUfQogICR7Q1VSUkVOVF9NT05USF9OQU1FX1NIT1JUfQogICR7Q1VSUkVOVF9NT05USH0KICAke0NVUlJFTlRfREFURX0KICAke0NVUlJFTlRfWUVBUn0KICAke0NVUlJFTlRfWUVBUl9TSE9SVH0KICAke0NVUlJFTlRfSE9VUn0KICAke0NVUlJFTlRfTUlOVVRFfQogICR7Q1VSUkVOVF9TRUNPTkR9CiAgJHtDVVJSRU5UX1NFQ09ORFNfVU5JWH0KICAke1JBTkRPTX0KICAke1JBTkRPTV9IRVh9CiAgJHtVVUlEfQogICR7QkxPQ0tfQ09NTUVOVF9TVEFSVH0KICAke0JMT0NLX0NPTU1FTlRfRU5EfQogICR7TElORV9DT01NRU5UfQp9KTs=";
export const recipeForUser =
  "dGhyZWFkOjpzcGF3bihtb3ZlIHx8IHsKICAvLyB0aHJlYWQgY29kZSBoZXJlCn0pOw==";

export const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(() => resolve(), ms));

export function testDataUri(file: string) {
  return vscode.Uri.parse(`untitled:${file}`);
}

export function mockRecipe(code: string): Promise<AssistantRecipe[]> {
  return new Promise<AssistantRecipe[]>((resolve, reject) => {
    if (code !== "") {
      resolve([
        {
          id: 42069,
          name: "Spawn a thread mock",
          description: "Quickly spawn a thread using the std library",
          language: "Rust",
          isPublic: true,
          isGlobal: true,
          keywords: ["spawn", "thr"],
          tags: [],
          code: code,
          imports: ["use std::thread;"],
          shortcut: "spawn.thr",
          vscodeFormat: code,
          presentableFormat: code,
        },
      ]);
    } else {
      reject("Empty code param");
    }
  });
}

export async function closeFile() {
  vscode.commands.executeCommand("workbench.action.closeActiveEditor");
  await wait(1000);
}

// we don't use SnippetInsert, no need to use it
export function insertText(editor: vscode.TextEditor, code: string) {
  if (editor) {
    editor.edit((editBuilder) => {
      editBuilder.insert(editor.selection.active, code);
    });
  }
}

export async function autoComplete() {
  await vscode.commands.executeCommand("editor.action.triggerSuggest");
  await wait(500);
  await vscode.commands.executeCommand("acceptSelectedSuggestion");
  await wait(500);
}

export const Config = Object.freeze({
  tabSize: "editor.tabSize",
  insertSpaces: "editor.insertSpaces",
} as const);

// helper function to manage configuration state, DO NOT try to set/update
// configuration inside test/suite without this.
export type VsCodeConfiguration = { [key: string]: unknown };
export async function updateConfig(
  documentUri: vscode.Uri,
  newConfig: VsCodeConfiguration
): Promise<VsCodeConfiguration> {
  const oldConfig: VsCodeConfiguration = {};
  const config = vscode.workspace.getConfiguration(undefined, documentUri);

  for (const configKey of Object.keys(newConfig)) {
    oldConfig[configKey] = config.get(configKey);
    await new Promise<void>((resolve, reject) =>
      config
        .update(
          configKey,
          newConfig[configKey],
          vscode.ConfigurationTarget.Global
        )
        .then(() => resolve(), reject)
    );
  }
  return oldConfig;
}
