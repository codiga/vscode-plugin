// import {fail} from "assert";
// import {Rule} from "../rosie/rosieTypes";
//
// export const wait = async (ms: number) =>
//   new Promise<void>((resolve) => setTimeout(() => resolve(), ms));
//
// /**
//  * Creates a URI for the given file name for when the file does not exist in the workspace.
//  *
//  * @param file the file name
//  */
// export function testDataUri(file: string) {
//   return vscode.Uri.parse(`untitled:${file}`);
// }
//
// /**
//  * Creates a URI for the given file within the current workspace.
//  *
//  * @param file the path of the file within the workspace
//  */
// export async function testDataUriInWorkspace(file: string) {
//   let workspaceFolder = await getWorkspaceFolder();
//   return vscode.Uri.parse(`${workspaceFolder.uri.path}/${file}`);
// }
//
// export async function getWorkspaceFolder() {
//   const workspaceFolders = await vscode.workspace.workspaceFolders;
//   if (!workspaceFolders) {
//     fail("No workspace folder available.");
//   }
//   return workspaceFolders[0];
// }
//
// /**
//  * Creates a mock AST Rule for the given language with the given content.
//  */
// export function createMockRule(
//   content: string,
//   language: string,
//   rulesetName: string = "mock-ruleset",
//   ruleName: string = "mock-rule"
// ): Rule {
//   return {
//     rulesetName: rulesetName,
//     ruleName: ruleName,
//     contentBase64: content,
//     entityChecked: null,
//     id: `${rulesetName}/${ruleName}`,
//     language: language,
//     pattern: null,
//     type: "ast"
//   };
// }
//
// // we don't use SnippetInsert, no need to use it
// export async function insertText(editor: vscode.TextEditor, code: string) {
//   if (editor) {
//     await editor.edit((editBuilder) => {
//       editBuilder.insert(editor.selection.active, code);
//     });
//   }
// }
//
// /**
//  * Deletes the given range of text in the given text editor.
//  *
//  * @param editor the editor in which to delete the text
//  * @param range the range of text
//  */
// export async function deleteText(editor: vscode.TextEditor, range: vscode.Range) {
//   if (editor) {
//     await editor.edit((editBuilder) => {
//       editBuilder.delete(range);
//     });
//   }
// }
//
// /**
//  * Replaces the entire content of the editor with the given text.
//  *
//  * @param editor the editor in which to delete the text
//  * @param code the replace text
//  */
// export async function replaceText(editor: vscode.TextEditor, code: string) {
//   if (editor) {
//     await editor.edit((editBuilder) => {
//       editBuilder.replace(new vscode.Range(
//         new vscode.Position(0, 0),
//         new vscode.Position(editor.document.lineCount - 1, editor.document.getText().length)),
//         code);
//     });
//   }
// }
