// import * as assert from "assert";
// import * as vscode from "vscode";
// import {DiagnosticSeverity} from "vscode";
// import {
//   closeFile,
//   // createMockRule,
//   deleteText,
//   getWorkspaceFolder,
//   replaceText,
//   testDataUriInWorkspace,
//   wait
// } from "../testUtils";
// import {CacheData, CodigaYmlConfig, refreshCacheForWorkspace} from "../../rosie/rosieCache";

// suite("Rosie diagnostics", () => {
//   const jsRule1 = createMockRule("ZnVuY3Rpb24gdmlzaXQocGF0dGVybiwgZmlsZW5hbWUsIGNvZGUpIHsKfQ==", "javascript");
//   const jsRule2 = createMockRule(
//     "ZnVuY3Rpb24gdmlzaXQocGF0dGVybiwgZmlsZW5hbWUsIGNvZGUpIHsKICAgIGFkZEVycm9yKGJ1aWxkRXJyb3IobW9kZS5zdGFydC5saW5lLCBtb2RlLnN0YXJ0LmNvbCwgbW9kZS5lbmQubGluZSwgbW9kZS5lbmQuY29sLCAiZXJyb3IgbWVzc2FnZSIsICJDUklUSUNBTCIsICJzZWN1cml0eSIpKTsKICB9Cn0=",
//     "javascript");
//   const pythonRule1 = createMockRule("ZnVuY3Rpb24gdmlzaXQocGF0dGVybiwgZmlsZW5hbWUsIGNvZGUpIHsKfQ==", "python");
//   const cacheData: CacheData = {
//     codigaYmlConfig: CodigaYmlConfig.EMPTY,
//     lastRefreshed: 0,
//     lastTimestamp: 1,
//     fileLastModification: 0,
//     rules: [jsRule1, jsRule2, pythonRule1]
//   };
//
//   //Hooks
//
//   setup(async () => {
//     //Populate the rules cache
//     const workspaceFolder = await getWorkspaceFolder();
//     await refreshCacheForWorkspace(workspaceFolder, cacheData);
//   });
//
//   teardown(async () => {
//     await closeFile();
//   });
//
//   // No diagnostics cases
//
//   async function testNoDiagnostics(fileName: string) {
//     //Open the file
//     const fileUri = await testDataUriInWorkspace(fileName);
//     const file = await vscode.workspace.openTextDocument(fileUri);
//     await vscode.window.showTextDocument(file);
//
//     //Wait for the diagnostics to be calculated
//     await wait(2000);
//
//     //Check if there is no diagnostics for this file
//     const diagnostics = vscode.languages.getDiagnostics();
//     //Lowercase conversion is used because the disk drive letter can differ: C: vs. c:
//     const diagsForFile = diagnostics.filter(diag => diag[0].path.toLowerCase() === fileUri.path.toLowerCase());
//     assert.strictEqual(diagsForFile.length, 0);
//   }
//
//   test("No diagnostic for unknown document language", async () => {
//     await testNoDiagnostics("unknown");
//   });
//
//   test("No diagnostic for not supported document language", async () => {
//     await testNoDiagnostics("unsupported.txt");
//   });
//
//   test("No diagnostic for empty document", async () => {
//     await testNoDiagnostics("emptyFile.py");
//   });
//
//   test("No diagnostic for one-line document", async () => {
//     await testNoDiagnostics("oneLineFile.js");
//   });
//
//   // Diagnostics cases
//
//   test("Diagnostics are displayed with proper severities", async () => {
//     //Open the file
//     const fileUri = await testDataUriInWorkspace("typescript.tsx");
//     const file = await vscode.workspace.openTextDocument(fileUri);
//     await vscode.window.showTextDocument(file);
//
//     //Wait for the diagnostics to be calculated
//     await wait(2000);
//
//     //Check if the diagnostics are display with their proper severities and messages
//     const diagnostics = vscode.languages.getDiagnostics();
//     const fileDiags = diagnostics[0][1];
//
//     assert.strictEqual(fileDiags[0].severity, DiagnosticSeverity.Error);
//     assert.strictEqual(fileDiags[0].message, "critical_violation");
//     assert.strictEqual(fileDiags[1].severity, DiagnosticSeverity.Warning);
//     assert.strictEqual(fileDiags[1].message, "error_violation");
//     assert.strictEqual(fileDiags[2].severity, DiagnosticSeverity.Warning);
//     assert.strictEqual(fileDiags[2].message, "warning_violation");
//     assert.strictEqual(fileDiags[3].severity, DiagnosticSeverity.Information);
//     assert.strictEqual(fileDiags[3].message, "info_violation");
//   });
//
//   test("Updates diagnostics on document change", async () => {
//     //Open the file and save its contents for later restoration
//     const fileUri = await testDataUriInWorkspace("typescript.tsx");
//     const file = await vscode.workspace.openTextDocument(fileUri);
//     const editor = await vscode.window.showTextDocument(file);
//     const originalText = file.getText();
//
//     //Wait for the diagnostics to be calculated
//     await wait(2000);
//
//     //Delete some text from the document to act as modification
//     await deleteText(editor, new vscode.Range(new vscode.Position(1, 0), new vscode.Position(5, 0)));
//     await file.save();
//     await wait(2000);
//
//     //Check if the diagnostics are re-calculated for the updated document
//     const diagnostics = vscode.languages.getDiagnostics();
//     const fileDiags = diagnostics[0][1];
//     assert.strictEqual(fileDiags.length, 1);
//     assert.strictEqual(fileDiags[0].severity, DiagnosticSeverity.Error);
//     assert.strictEqual(fileDiags[0].message, "critical_violation");
//
//     //Restore the original content of the file, since during local test execution
//     // it would be a hassle to restore it manually after each test run.
//     await replaceText(editor, originalText);
//     await file.save();
//   });
// });
