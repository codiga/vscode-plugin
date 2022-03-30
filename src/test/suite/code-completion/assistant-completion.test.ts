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
  updateConfig,
  pythonRecipe,
  mockRecipePython,
  documentPythonRecipeImportsAfterCommentsExpected,
  mockRecipeJava,
  javaRecipe,
  documentJavaRecipeImportsAfterCommentsExpected,
} from "../testUtils";

// test recipe auto complete capabilities of the plugin, we create mocks and stub
// for recipe fetch and recipe usage endpoints
suite("assistant-completion.ts test", () => {
  const uri = testDataUri("assistant-completion.rs");
  const pythonUri = testDataUri("assistant-completion.py");
  const javaUri = testDataUri("assistant-completion.java");

  // a sandbox is required so we stubs and mocks are not mixed with other test suites
  const sandbox = sinon.createSandbox();
  // stub and mock two api calls required for this test suite
  const getRustRecipeStub: () => sinon.SinonStub = () =>
    sandbox
      .stub(getRecipesApiCall, "getRecipesForClientByShorcut")
      .withArgs("spawn.", "assistant-completion.rs", Language.Rust, []);

  let getPythonRecipeStub: () => sinon.SinonStub = () =>
    sandbox
      .stub(getRecipesApiCall, "getRecipesForClientByShorcut")
      .withArgs("requests.", "assistant-completion.py", Language.Python, []);

  let getJavaRecipeStub: () => sinon.SinonStub = () =>
    sandbox
      .stub(getRecipesApiCall, "getRecipesForClientByShorcut")
      .withArgs("java.", "assistant-completion.java", Language.Java, []);

  let usedRecipeMock: sinon.SinonExpectation;

  // these are the first state values for the settings we want to change and restore
  // in the following tests
  const configDefaults: VsCodeConfiguration = Object.freeze({
    [Config.tabSize]: 2,
    [Config.insertSpaces]: true,
  });
  let originalConfig: { [key: string]: unknown } = {};

  // stub and mock two api calls required for this test suite
  setup(async () => {
    // always start with a freezed config
    originalConfig = await updateConfig(uri, configDefaults);
    // define the stub and mock

    usedRecipeMock = sandbox
      .mock(usedRecipeApiCall)
      .expects("useRecipeCallback")
      .withArgs(42069)
      .once();
  });

  // this is executed after each test finishes
  teardown(async () => {
    // things get messy really quick, do not remove this step
    await updateConfig(uri, originalConfig);
    sandbox.restore();
  });

  test("test insert suggestion from completion widget works", async () => {
    getRustRecipeStub().returns(mockRecipe(recipeForUser));

    const document = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(document);
    await wait(500);

    insertText(editor, "spawn.");
    await autoComplete();
    const documentTransformed = editor?.document.getText();

    await wait(500);
    await closeFile();

    assert.ok(usedRecipeMock.verify());
    assert.strictEqual(documentTransformed, documentRecipeExpected);
  });

  test("test recipe indentation in recipe insertion with four indentation spaces", async () => {
    getRustRecipeStub().returns(mockRecipe(recipeWithIndentVariable));
    await updateConfig(uri, {
      [Config.tabSize]: 4,
      [Config.insertSpaces]: true,
    });

    const document = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(document);
    await wait(500);

    insertText(editor, "spawn.");
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
    getRustRecipeStub().returns(mockRecipe(recipeWithIndentVariable));

    const document = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(document);
    await wait(500);

    insertText(editor, "spawn.");
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
    getRustRecipeStub().returns(mockRecipe(recipeWithIndentVariable));
    await updateConfig(uri, {
      [Config.tabSize]: 4,
      [Config.insertSpaces]: false,
    });

    const document = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(document);
    await wait(500);

    insertText(editor, "spawn.");
    await autoComplete();
    const documentTransformed = editor?.document.getText();

    await wait(500);
    await closeFile();

    assert.ok(usedRecipeMock.verify());
    assert.ok(
      documentTransformed ===
        new vscode.SnippetString(documentRecipeIndentExpectedWithTabs).value
    );
  });

  test("test imports are added after first comments in Python", async () => {
    getPythonRecipeStub().returns(mockRecipePython(pythonRecipe));

    const document = await vscode.workspace.openTextDocument(pythonUri);
    const editor = await vscode.window.showTextDocument(document);
    await wait(500);
    insertText(editor, "# First\n# Second\n");
    await wait(500);
    insertText(editor, "requests.");
    await autoComplete();
    const documentTransformed = editor?.document.getText();

    await wait(500);
    await closeFile();

    assert.ok(usedRecipeMock.verify());

    assert.strictEqual(
      documentTransformed,
      documentPythonRecipeImportsAfterCommentsExpected
    );
  });

  test("test imports are added after first comments in Java", async () => {
    getJavaRecipeStub().returns(mockRecipeJava(javaRecipe));

    const document = await vscode.workspace.openTextDocument(javaUri);
    const editor = await vscode.window.showTextDocument(document);
    await wait(500);
    insertText(editor, `/*\n* Comment example\n*/\n`);
    await wait(500);
    insertText(editor, "java.");
    await autoComplete();
    const documentTransformed = editor?.document.getText();

    await wait(500);
    await closeFile();

    assert.ok(usedRecipeMock.verify());

    assert.strictEqual(
      documentTransformed,
      documentJavaRecipeImportsAfterCommentsExpected
    );
  });
});
