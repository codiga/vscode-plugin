import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import { readRequirementsFile } from "../../../../utils/dependencies/python";
import { getDataFile } from "./utils";

// import * as myExtension from '../../extension';

suite("python.ts test", () => {
  vscode.window.showInformationMessage("Start fileUtils tests.");

  test("get all dependencies", async () => {
    const completePath = getDataFile("requirements1.txt");
    const uri = vscode.Uri.parse(completePath);
    const packages = await readRequirementsFile(uri);
    assert.strictEqual(true, packages.includes("whatthepatch"));
    assert.strictEqual(true, packages.includes("pylint"));
  });
});
