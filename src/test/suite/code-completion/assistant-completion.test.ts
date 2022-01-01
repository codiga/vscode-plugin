import * as assert from "assert";
import * as vscode from "vscode";
import * as sinon from "sinon";

import * as getRecipesApiCall from "../../../graphql-api/get-recipes-for-client";
import * as usedRecipeApiCall from "../../../graphql-api/use-recipe";
import { Language } from "../../../graphql-api/types";
import {
  wait,
  closeFile,
  insertText,
  mockRecipe,
  autoComplete,
  recipeForUser,
  documentRecipeExpected,
  documentRecipeIndentExpectedWithFourSpaces,
  documentRecipeIndentExpectedWithTwoSpaces,
  documentRecipeIndentExpectedWithTabs,
  recipeWithIndentVariable,
  testDataUri,
  Config,
  VsCodeConfiguration,
  updateConfig
} from "../testUtils";

// test recipe auto complete capabilities of the plugin, we create mocks and stub
// for recipe fetch and recipe usage endpoints
suite("assistant-completion.ts test", () => {
  const uri = testDataUri("assistant-completion.rs");

  // a sandbox is required so we stubs and mocks are not mixed with other test suites
  const sandbox = sinon.createSandbox();
  // stub and mock two api calls required for this test suite
  let getRecipeStub: sinon.SinonStub;
  let usedRecipeMock: sinon.SinonExpectation;

  // these are the first state values for the settings we want to change and restore
  // in the following tests
  const configDefaults: VsCodeConfiguration = Object.freeze({
		[Config.tabSize]: 2,
		[Config.insertSpaces]: true,
	});
  let originalConfig: { [key: string]: any } = {};

  // stub and mock two api calls required for this test suite
  setup(async() => {
    // always start with a freezed config
    originalConfig = await updateConfig(uri, configDefaults)
    // define the stub and mock
    getRecipeStub = sandbox
      .stub(getRecipesApiCall, "getRecipesForClient")
      .withArgs(["spawn", "thr"], "assistant-completion.rs", Language.Rust, []);
    usedRecipeMock = sandbox.mock(usedRecipeApiCall)
      .expects("useRecipeCallback")
      .withArgs(42069)
      .once();
  });

  // this is executed after each test finishes
  teardown(async() => {
    // things get messy really quick, do not remove this step
    await updateConfig(uri, originalConfig);
    sandbox.restore();
  });

  test("test insert suggestion from completion widget works", async () => {
    getRecipeStub.returns(mockRecipe(recipeForUser));

    const document = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(document);
    await wait(500);

    insertText(editor, "spawn thr");
    await autoComplete();
    const documentTransformed = editor?.document.getText();
    
    await wait(500);
    await closeFile();

    assert.ok(usedRecipeMock.verify());
    assert.strictEqual(documentTransformed, documentRecipeExpected);
  });

  test("test recipe indentation in recipe insertion with four indentation spaces", async () => {
    getRecipeStub.returns(mockRecipe(recipeWithIndentVariable));
    await updateConfig(uri, { [Config.tabSize]: 4, [Config.insertSpaces]: true });

    const document = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(document);
    await wait(500);

    insertText(editor, "spawn thr");
    await autoComplete();
    const documentTransformed = editor?.document.getText();

    await wait(500);
    await closeFile();

    assert.ok(usedRecipeMock.verify());
    assert.ok(
      documentTransformed ===
        new vscode.SnippetString(documentRecipeIndentExpectedWithFourSpaces)
          .value
    );
  });

  test("test recipe indentation in recipe insertion with two indentation spaces", async () => {
    getRecipeStub.returns(mockRecipe(recipeWithIndentVariable));

    const document = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(document);
    await wait(500);

    insertText(editor, "spawn thr");
    await autoComplete();
    const documentTransformed = editor?.document.getText();

    await wait(500);
    await closeFile();

    assert.ok(usedRecipeMock.verify());
    assert.ok(
      documentTransformed ===
        new vscode.SnippetString(documentRecipeIndentExpectedWithTwoSpaces)
          .value
    );
  });

  test("test recipe indentation in recipe insertion tab indentation", async () => {
    getRecipeStub.returns(mockRecipe(recipeWithIndentVariable));
    await updateConfig(uri, { [Config.tabSize]: 4, [Config.insertSpaces]: false });

    const document = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(document);
    await wait(500);

    insertText(editor, "spawn thr");
    await autoComplete();
    const documentTransformed = editor?.document.getText();
    
    await wait(500);
    await closeFile();

    assert.ok(usedRecipeMock.verify());
    assert.ok(
      documentTransformed ===
        new vscode.SnippetString(documentRecipeIndentExpectedWithTabs)
          .value
    );
  });
});
