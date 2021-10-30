import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import { readComposerFile } from "../../../../utils/dependencies/php";

// import * as myExtension from '../../extension';

suite("php.ts test", () => {
  vscode.window.showInformationMessage("Start fileUtils tests.");

  test("get all dependencies", async () => {
    const completePath = `${__dirname}/../../../../../src/test/data/composer1.json`;
    const uri = vscode.Uri.parse(completePath);
    const packages = await readComposerFile(uri);
    assert.strictEqual(true, packages.includes("php"));
    assert.strictEqual(true, packages.includes("acquia/blt-require-dev"));
  });
});
