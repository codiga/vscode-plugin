// import * as assert from "assert";
// import * as vscode from "vscode";
// import {closeFile, testDataUriInWorkspace, wait} from "../testUtils";
// import {applyFix} from "../../rosie/rosiefix";
// import {ignoreViolation} from "../../diagnostics/ignore-violation";
//
// suite("Rosie quick fixes", () => {
//   let file: vscode.TextDocument;
//
//   function assertNoEditHappened() {
//     assert.strictEqual(file.getText(),
//       normalizeLineEndings("class Duck {\r\n" +
//       "  private _size: number;\r\n" +
//       "  constructor(size: number) {\r\n" +
//       "    this._size = size;\r\n" +
//       "  }\r\n" +
//       "}\r\n" +
//       "const x = 6;"));
//   }
//
//   /**
//    * Removes \r characters from the argument string, if the test is executed on a non-Windows platform.
//    */
//   function normalizeLineEndings(code: string): string {
//     return process.platform === "win32" ? code : code.replace(/\r/g, "");
//   }
//
//   // Hooks
//
//   setup(async () => {
//     //Open the file
//     const fileUri = await testDataUriInWorkspace("typescript.tsx");
//     file = await vscode.workspace.openTextDocument(fileUri);
//     await vscode.window.showTextDocument(file);
//     await wait(500);
//   });
//
//   teardown(async () => {
//     await closeFile();
//   });
//
//   // Test cases
//
//   test("No fix is applied when no Rosie edit is available", async () => {
//     await applyFix(file, {description: "A fix without edits", edits: []});
//
//     assertNoEditHappened();
//   });
//
//   test("No fix is applied when start line is negative for addition", async () => {
//     await applyFix(file,
//       {
//         description: "Addition fix",
//         edits: [
//           {
//             content: "Text added",
//             editType: "add",
//             start: {line: 0, col: 5},
//             end: {line: 1, col: 10}
//           }
//         ]
//       });
//
//     assertNoEditHappened();
//   });
//
//   test("No fix is applied when start position is negative for addition", async () => {
//     await applyFix(file,
//       {
//         description: "Addition fix",
//         edits: [
//           {
//             content: "Text added",
//             editType: "add",
//             start: {line: 1, col: -5},
//             end: {line: 1, col: 10}
//           }
//         ]
//       });
//
//     assertNoEditHappened();
//   });
//
//   //This is the behaviour on VS Code side and not on Codiga side
//   test("Adds text at the end of the document when start line is beyond document length", async () => {
//     await applyFix(file,
//       {
//         description: "Addition fix",
//         edits: [
//           {
//             content: "Text added",
//             editType: "add",
//             start: {line: 10, col: 5},
//             end: {line: 1, col: 10}
//           }
//         ]
//       });
//
//     assert.strictEqual(file.getText(),
//       normalizeLineEndings("class Duck {\r\n" +
//       "  private _size: number;\r\n" +
//       "  constructor(size: number) {\r\n" +
//       "    this._size = size;\r\n" +
//       "  }\r\n" +
//       "}\r\n" +
//       "const x = 6;Text added"));
//   });
//
//   //This is the behaviour on VS Code side and not on Codiga side
//   test("Adds text at the end of the document when start position is beyond document length", async () => {
//     await applyFix(file,
//       {
//         description: "Addition fix",
//         edits: [
//           {
//             content: "Text added",
//             editType: "add",
//             start: {line: 7, col: 25},
//             end: {line: 1, col: 10}
//           }
//         ]
//       });
//
//     assert.strictEqual(file.getText(),
//       normalizeLineEndings("class Duck {\r\n" +
//       "  private _size: number;\r\n" +
//       "  constructor(size: number) {\r\n" +
//       "    this._size = size;\r\n" +
//       "  }\r\n" +
//       "}\r\n" +
//       "const x = 6;Text added"));
//   });
//
//   test("No fix is applied when start line is negative for non-addition", async () => {
//     await applyFix(file,
//       {
//         description: "Removal fix",
//         edits: [
//           {
//             content: "Removal",
//             editType: "remove",
//             start: {line: 0, col: 5},
//             end: {line: 1, col: 10}
//           }
//         ]
//       });
//
//     assertNoEditHappened();
//   });
//
//   test("No fix is applied when start position is negative for non-addition", async () => {
//     await applyFix(file,
//       {
//         description: "Removal fix",
//         edits: [
//           {
//             content: "Removal",
//             editType: "remove",
//             start: {line: 1, col: -5},
//             end: {line: 1, col: 10}
//           }
//         ]
//       });
//
//     assertNoEditHappened();
//   });
//
//   test("No fix is applied when start line is beyond document length for removal", async () => {
//     await applyFix(file,
//       {
//         description: "Removal fix",
//         edits: [
//           {
//             content: "Removal",
//             editType: "remove",
//             start: {line: 10, col: 5},
//             end: {line: 10, col: 10}
//           }
//         ]
//       });
//
//     assertNoEditHappened();
//   });
//
//   test("No fix is applied when start position is beyond document length for non-addition", async () => {
//     await applyFix(file,
//       {
//         description: "Removal fix",
//         edits: [
//           {
//             content: "Removal",
//             editType: "remove",
//             start: {line: 7, col: 25},
//             end: {line: 7, col: 30}
//           }
//         ]
//       });
//
//     assertNoEditHappened();
//   });
//
//   test("No fix is applied when end line is negative", async () => {
//     await applyFix(file,
//       {
//         description: "Removal fix",
//         edits: [
//           {
//             content: "Removal",
//             editType: "remove",
//             start: {line: 1, col: 5},
//             end: {line: 0, col: 10}
//           }
//         ]
//       });
//
//     assertNoEditHappened();
//   });
//
//   test("No fix is applied when end position is negative", async () => {
//     await applyFix(file,
//       {
//         description: "Removal fix",
//         edits: [
//           {
//             content: "Removal",
//             editType: "remove",
//             start: {line: 1, col: 5},
//             end: {line: 1, col: -10}
//           }
//         ]
//       });
//
//     assertNoEditHappened();
//   });
//
//   //This is the behaviour on VS Code side and not on Codiga side
//   test("Replaces text at the end of the document when end position is beyond document length", async () => {
//     await applyFix(file,
//       {
//         description: "Replacement fix",
//         edits: [
//           {
//             content: "Replacement",
//             editType: "update",
//             start: {line: 7, col: 1},
//             end: {line: 7, col: 50}
//           }
//         ]
//       });
//
//     assert.strictEqual(file.getText(),
//       normalizeLineEndings("class Duck {\r\n" +
//       "  private _size: number;\r\n" +
//       "  constructor(size: number) {\r\n" +
//       "    this._size = size;\r\n" +
//       "  }\r\n" +
//       "}\r\n" +
//       "Replacement"));
//   });
//
//   test("No fix is applied when end position is less than start position", async () => {
//     await applyFix(file,
//       {
//         description: "Replacement fix",
//         edits: [
//           {
//             content: "Replacement",
//             editType: "update",
//             start: {line: 4, col: 5},
//             end: {line: 2, col: 10}
//           }
//         ]
//       });
//
//     assertNoEditHappened();
//   });
//
//   test("Adds text", async () => {
//     await applyFix(file,
//       {
//         description: "Addition fix",
//         edits: [
//           {
//             content: "Text added",
//             editType: "add",
//             start: {line: 1, col: 5},
//             end: {line: 1, col: 10}
//           }
//         ]
//       });
//
//     assert.strictEqual(file.getText(),
//       normalizeLineEndings("clasText addeds Duck {\r\n" +
//       "  private _size: number;\r\n" +
//       "  constructor(size: number) {\r\n" +
//       "    this._size = size;\r\n" +
//       "  }\r\n" +
//       "}\r\n" +
//       "const x = 6;"));
//   });
//
//   test("Replaces text", async () => {
//     await applyFix(file,
//       {
//         description: "Replacement fix",
//         edits: [
//           {
//             content: "Replacement",
//             editType: "update",
//             start: {line: 1, col: 5},
//             end: {line: 1, col: 10}
//           }
//         ]
//       });
//
//     assert.strictEqual(file.getText(),
//       normalizeLineEndings("clasReplacementk {\r\n" +
//       "  private _size: number;\r\n" +
//       "  constructor(size: number) {\r\n" +
//       "    this._size = size;\r\n" +
//       "  }\r\n" +
//       "}\r\n" +
//       "const x = 6;"));
//   });
//
//   test("Replaces text at the end of the document", async () => {
//     await applyFix(file,
//       {
//         description: "Replacement fix",
//         edits: [
//           {
//             content: "Replacement",
//             editType: "update",
//             start: {line: 7, col: 3},
//             end: {line: 7, col: 13}
//           }
//         ]
//       });
//
//     assert.strictEqual(file.getText(),
//       normalizeLineEndings("class Duck {\r\n" +
//       "  private _size: number;\r\n" +
//       "  constructor(size: number) {\r\n" +
//       "    this._size = size;\r\n" +
//       "  }\r\n" +
//       "}\r\n" +
//       "coReplacement"));
//   });
//
//   test("Deletes text", async () => {
//     await applyFix(file,
//       {
//         description: "Removal fix",
//         edits: [
//           {
//             content: "Removal",
//             editType: "remove",
//             start: {line: 1, col: 5},
//             end: {line: 1, col: 10}
//           }
//         ]
//       });
//
//     assert.strictEqual(file.getText(),
//       normalizeLineEndings("clask {\r\n" +
//       "  private _size: number;\r\n" +
//       "  constructor(size: number) {\r\n" +
//       "    this._size = size;\r\n" +
//       "  }\r\n" +
//       "}\r\n" +
//       "const x = 6;"));
//   });
//
//   test("Deletes text at the end of the document", async () => {
//     await applyFix(file,
//       {
//         description: "Removal fix",
//         edits: [
//           {
//             content: "Removal",
//             editType: "remove",
//             start: {line: 7, col: 3},
//             end: {line: 7, col: 13}
//           }
//         ]
//       });
//
//     assert.strictEqual(file.getText(),
//       normalizeLineEndings("class Duck {\r\n" +
//       "  private _size: number;\r\n" +
//       "  constructor(size: number) {\r\n" +
//       "    this._size = size;\r\n" +
//       "  }\r\n" +
//       "}\r\n" +
//       "co"));
//   });
//
//
//   test("Applies multiple edits, also excluding edits with unknown edit types", async () => {
//     await applyFix(file,
//       {
//         description: "Multi-edit fix",
//         edits: [
//           {
//             content: "Removal",
//             editType: "remove",
//             start: {line: 7, col: 3},
//             end: {line: 7, col: 13}
//           },
//           {
//             content: "Replacement",
//             editType: "update",
//             start: {line: 2, col: 2},
//             end: {line: 2, col: 6}
//           },
//           {
//             content: "Unknown",
//             editType: "unknown",
//             start: {line: 4, col: 3},
//             end: {line: 4, col: 8}
//           }
//         ]
//       });
//
//     assert.strictEqual(file.getText(),
//       normalizeLineEndings("class Duck {\r\n" +
//       " Replacementvate _size: number;\r\n" +
//       "  constructor(size: number) {\r\n" +
//       "    this._size = size;\r\n" +
//       "  }\r\n" +
//       "}\r\n" +
//       "co"));
//   });
//
//   test("Replaces text in multiple lines", async () => {
//     await applyFix(file,
//       {
//         description: "Replacement fix",
//         edits: [
//           {
//             content: "Replacement",
//             editType: "update",
//             start: {line: 1, col: 1},
//             end: {line: 3, col: 5}
//           }
//         ]
//       });
//
//     assert.strictEqual(file.getText(),
//       normalizeLineEndings("Replacementnstructor(size: number) {\r\n" +
//       "    this._size = size;\r\n" +
//       "  }\r\n" +
//       "}\r\n" +
//       "const x = 6;"));
//   });
//
//   test("Deletes text in multiple lines", async () => {
//     await applyFix(file,
//       {
//         description: "Removal fix",
//         edits: [
//           {
//             content: "Removal",
//             editType: "remove",
//             start: {line: 1, col: 1},
//             end: {line: 3, col: 5}
//           }
//         ]
//       });
//
//     assert.strictEqual(file.getText(),
//       normalizeLineEndings("nstructor(size: number) {\r\n" +
//       "    this._size = size;\r\n" +
//       "  }\r\n" +
//       "}\r\n" +
//       "const x = 6;"));
//   });
//
//   test("Adds codiga-disable comment in the first row", async () => {
//     await ignoreViolation(file,
//       new vscode.Range(
//         new vscode.Position(0, 2),
//         new vscode.Position(0, 6)),
//       "ruleId");
//
//     assert.strictEqual(file.getText(),
//       normalizeLineEndings("// codiga-disable\r\n" +
//       "class Duck {\r\n" +
//       "  private _size: number;\r\n" +
//       "  constructor(size: number) {\r\n" +
//       "    this._size = size;\r\n" +
//       "  }\r\n" +
//       "}\r\n" +
//       "const x = 6;"));
//   });
//
//   test("Adds codiga-disable comment within the document", async () => {
//     await ignoreViolation(file,
//       new vscode.Range(
//         new vscode.Position(3, 2),
//         new vscode.Position(3, 10)),
//       "ruleId");
//
//     assert.strictEqual(file.getText(),
//       normalizeLineEndings("class Duck {\r\n" +
//       "  private _size: number;\r\n" +
//       "  constructor(size: number) {\r\n" +
//       "    // codiga-disable\r\n" +
//       "    this._size = size;\r\n" +
//       "  }\r\n" +
//       "}\r\n" +
//       "const x = 6;"));
//   });
//
//   test("Adds codiga-disable comment for violation in the last row", async () => {
//     await ignoreViolation(file,
//       new vscode.Range(
//         new vscode.Position(6, 1),
//         new vscode.Position(6, 6)),
//       "ruleId");
//
//     assert.strictEqual(file.getText(),
//       normalizeLineEndings("class Duck {\r\n" +
//       "  private _size: number;\r\n" +
//       "  constructor(size: number) {\r\n" +
//       "    this._size = size;\r\n" +
//       "  }\r\n" +
//       "}\r\n" +
//       "// codiga-disable\r\n" +
//       "const x = 6;"));
//   });
//
//   test("Adds codiga-disable comment in python file", async () => {
//     //Close typescript.tsx that is opened in the setup phase
//     await closeFile();
//
//     //Open the file
//     const fileUri = await testDataUriInWorkspace("python.py");
//     file = await vscode.workspace.openTextDocument(fileUri);
//     await vscode.window.showTextDocument(file);
//
//     //Wait for the diagnostics to be calculated
//     await wait(500);
//
//     await ignoreViolation(file,
//       new vscode.Range(
//         new vscode.Position(1, 1),
//         new vscode.Position(1, 6)),
//       "ruleId");
//
//     assert.strictEqual(file.getText(),
//       normalizeLineEndings("def some_function():\r\n" +
//       "    # codiga-disable\r\n" +
//       "    y = \"some string\"\r\n"));
//   });
// });
