import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import { readPackageFile } from "../../../../utils/dependencies/javascript";
import { getDataFile } from "./utils";

// import * as myExtension from '../../extension';

suite("javascript.ts test", () => {
  vscode.window.showInformationMessage("Start fileUtils tests.");

  // test("get all dependencies", async () => {
  //   const completePath = getDataFile("package1.json");
  //   const uri = vscode.Uri.parse(completePath);
  //   const packages = await readPackageFile(uri);
  //   assert.strictEqual(true, packages.includes("react"));
  //   assert.strictEqual(true, packages.includes("@apollo/react-hooks"));
  // });

  // test("get all dependencies fails when files does not exists", async () => {
  //   const completePath = getDataFile("package-does-not-exists.json");
  //   const uri = vscode.Uri.parse(completePath);
  //   const packages = await readPackageFile(uri);
  //   assert.strictEqual(0, packages.length);
  // });

  // test("get all dependencies fails when package file is malformed", async () => {
  //   const completePath = getDataFile("package-malformed.json");
  //   const uri = vscode.Uri.parse(completePath);
  //   const packages = await readPackageFile(uri);
  //   assert.strictEqual(0, packages.length);
  // });
});
