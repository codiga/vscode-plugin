import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import { decodeIndent } from "../../../utils/indentationUtils";

suite("indentationUtil.ts test", () => {
  vscode.window.showInformationMessage("Start indentationUtil tests.");

  const expectedRecipe =
    'function (this) {\n' +
    '\tconsole.log(this)\n' +
    '\tconsole.log(that)\n' +
    '}\n';

  const fetchRecipe =
    'function (this) {\n' +
    '&[CODIGA_INDENT]console.log(this)\n' +
    '&[CODIGA_INDENT]console.log(that)\n' +
    '}\n';


  test("Make sure CODIGA_INDENT is decoded", () => {
    assert.strictEqual(decodeIndent(fetchRecipe), expectedRecipe);
  });
});
