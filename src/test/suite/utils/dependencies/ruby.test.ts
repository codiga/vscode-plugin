import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import { readGemfile } from "../../../../utils/dependencies/ruby";
import { getDataFile } from "./utils";

// import * as myExtension from '../../extension';

suite("ruby.ts test", () => {
  vscode.window.showInformationMessage("Start fileUtils tests.");

  // test("get all dependencies", async () => {
  //   const completePath = getDataFile("gemfile-example1");
  //   const uri = vscode.Uri.parse(completePath);
  //   const packages = await readGemfile(uri);

  //   assert.strictEqual(false, packages.includes("capistrano"));
  //   assert.strictEqual(true, packages.includes("sqlite3"));
  //   assert.strictEqual(true, packages.includes("rails"));
  //   assert.strictEqual(false, packages.includes("unicorn"));
  // });

  // test("get all dependencies 3", async () => {
  //   const completePath = getDataFile("gemfile-example3");
  //   const uri = vscode.Uri.parse(completePath);
  //   const packages = await readGemfile(uri);

  //   assert.strictEqual(true, packages.includes("jquery-rails"));
  //   assert.strictEqual(true, packages.includes("factory_girl_rails"));
  // });
});
