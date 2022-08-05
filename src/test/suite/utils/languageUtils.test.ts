import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import { getLanguageForFile } from "../../../utils/fileUtils";
import { Language } from "../../../graphql-api/types";
import { isLineComment } from "../../../utils/languageUtils";

suite("languageUtils.ts test", () => {
  vscode.window.showInformationMessage("Start languageUtils tests.");

  test("Find the right language", () => {
    assert.strictEqual(isLineComment("// my comment", "c"), true);
    assert.strictEqual(isLineComment("foobar // my comment", "c"), false);
  });
});
