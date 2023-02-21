import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import { escapeDollarSign } from "../../../utils/snippetUtils";

suite("snippetUtils.ts test", () => {
  vscode.window.showInformationMessage("Start snippetUtils tests.");

  test("escape dollar sign for regular dollar sign", () => {
    assert.strictEqual(
      escapeDollarSign("mystuff $bla $blou"),
      "mystuff \\$bla \\$blou"
    );
  });

  test("DO NOT escape dollar sign for placeholders", () => {
    assert.strictEqual(
      escapeDollarSign("for (const ${2:element} of ${1:array}) $0"),
      "for (const ${2:element} of ${1:array}) $0"
    );
  });
});
