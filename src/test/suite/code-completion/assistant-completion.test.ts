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
  documentJavaRecipeImportsAfterPackageExpected,
  documentJavaRecipeImportsBetweenCommentsExpected,
} from "../../testUtils";
import * as localStorage from "../../../utils/localStorage";

// test recipe auto complete capabilities of the plugin, we create mocks and stub
// for recipe fetch and recipe usage endpoints
suite("assistant-completion.ts test", () => {
  const rustUri = testDataUri("assistant-completion.rs");
  const pythonUri = testDataUri("assistant-completion.py");
  const javaUri = testDataUri("assistant-completion.java");

  // a sandbox is required so we stubs and mocks are not mixed with other test suites
  const sandbox = sinon.createSandbox();
  // stub and mock two api calls required for this test suite
  const getRustRecipeStub: () => sinon.SinonStub = () =>
    sandbox
      .stub(getRecipesApiCall, "getRecipesForClientByShorcut")
      .withArgs(
        sinon.match.in(["spawn.", undefined]),
        "assistant-completion.rs",
        Language.Rust,
        []
      );

  const getPythonRecipeStub: () => sinon.SinonStub = () =>
    sandbox
      .stub(getRecipesApiCall, "getRecipesForClientByShorcut")
      .withArgs(
        sinon.match.in(["requests.", undefined]),
        "assistant-completion.py",
        Language.Python,
        []
      );

  const getJavaRecipeStub: () => sinon.SinonStub = () =>
    sandbox
      .stub(getRecipesApiCall, "getRecipesForClientByShorcut")
      .withArgs(
        sinon.match.in(["java.", undefined]),
        "assistant-completion.java",
        Language.Java,
        []
      );

  let usedRecipeMock: sinon.SinonExpectation;

  // these are the first state values for the settings we want to change and restore
  // in the following tests
  const configDefaults: VsCodeConfiguration = Object.freeze({
    [Config.tabSize]: 2,
    [Config.insertSpaces]: true,
    [Config.detectIdentation]: "true",
  });

  // stub and mock two api calls required for this test suite
  setup(async () => {
    // always start with a freezed config
    // originalConfig = await updateConfig(rustUri, configDefaults);

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
    // await updateConfig(rustUri, originalConfig);
    sandbox.restore();
  });

  test("test insert suggestion from completion widget works", async () => {
    getRustRecipeStub().returns(mockRecipe(recipeForUser));

    const document = await vscode.workspace.openTextDocument(rustUri);
    const editor = await vscode.window.showTextDocument(document);
    await wait(500);
    const originalConfig = await updateConfig(rustUri, configDefaults);

    await insertText(editor, "spawn.");
    await autoComplete();
    const documentTransformed = editor?.document.getText();

    await wait(500);
    await closeFile();

    assert.ok(usedRecipeMock.verify());
    assert.strictEqual(documentTransformed, documentRecipeExpected);
    await updateConfig(rustUri, originalConfig);
  });

  test("test recipe indentation in recipe insertion with four indentation spaces", async () => {
    await updateConfig(rustUri, {
      [Config.tabSize]: 4,
      [Config.insertSpaces]: true,
      [Config.detectIdentation]: false,
    });
    getRustRecipeStub().returns(mockRecipe(recipeWithIndentVariable));

    const document = await vscode.workspace.openTextDocument(rustUri);
    const editor = await vscode.window.showTextDocument(document);

    await wait(500);

    await insertText(editor, "spawn.");
    await autoComplete();
    const documentTransformed = editor?.document.getText();

    await wait(500);
    await closeFile();

    assert.ok(usedRecipeMock.verify());
    // const expectedValue = new vscode.SnippetString(
    //   documentRecipeIndentExpectedWithFourSpaces
    // ).value;

    // assert.ok(documentTransformed === expectedValue);
    await updateConfig(rustUri, configDefaults);
  });

  test("test recipe indentation in recipe insertion tab indentation", async () => {
    await updateConfig(rustUri, {
      [Config.tabSize]: 4,
      [Config.insertSpaces]: false,
      [Config.detectIdentation]: false,
    });
    getRustRecipeStub().returns(mockRecipe(recipeWithIndentVariable));

    const document = await vscode.workspace.openTextDocument(rustUri);
    const editor = await vscode.window.showTextDocument(document);
    await wait(500);

    await insertText(editor, "spawn.");
    await autoComplete();
    const documentTransformed = editor?.document.getText();

    await wait(500);
    await closeFile();
    // const expectedValue = new vscode.SnippetString(
    //   documentRecipeIndentExpectedWithTabs
    // ).value;

    assert.ok(usedRecipeMock.verify());
    // assert.ok(documentTransformed === expectedValue);
    await updateConfig(rustUri, configDefaults);
  });

  test("test recipe indentation in recipe insertion with two indentation spaces", async () => {
    getRustRecipeStub().returns(mockRecipe(recipeWithIndentVariable));

    const document = await vscode.workspace.openTextDocument(rustUri);
    const editor = await vscode.window.showTextDocument(document);
    await wait(500);
    const originalConfig = await updateConfig(rustUri, configDefaults);

    await insertText(editor, "spawn.");
    await autoComplete();
    const documentTransformed = editor?.document.getText();

    await wait(500);
    await closeFile();

    assert.ok(usedRecipeMock.verify());
    const expectedValue = new vscode.SnippetString(
      documentRecipeIndentExpectedWithTwoSpaces
    ).value;

    assert.ok(documentTransformed === expectedValue);
    await updateConfig(rustUri, originalConfig);
  });

  test("test imports are added after first comments in Python", async () => {
    getPythonRecipeStub().returns(mockRecipePython(pythonRecipe));

    const document = await vscode.workspace.openTextDocument(pythonUri);
    const editor = await vscode.window.showTextDocument(document);
    await wait(500);
    const originalConfig = await updateConfig(pythonUri, configDefaults);

    await insertText(editor, "# First\n# Second\n");
    await wait(500);
    await insertText(editor, "requests.");
    await autoComplete();
    const documentTransformed = editor?.document.getText();

    await wait(500);
    await closeFile();

    assert.ok(usedRecipeMock.verify());

    assert.strictEqual(
      documentTransformed,
      documentPythonRecipeImportsAfterCommentsExpected,
      new vscode.SnippetString(documentPythonRecipeImportsAfterCommentsExpected)
        .value
    );
    await updateConfig(pythonUri, originalConfig);
  });

  test("test imports are added after first comments and package in Java", async () => {
    getJavaRecipeStub().returns(mockRecipeJava(javaRecipe));

    const document = await vscode.workspace.openTextDocument(javaUri);
    const editor = await vscode.window.showTextDocument(document);
    await wait(500);
    const originalConfig = await updateConfig(pythonUri, configDefaults);
    await insertText(
      editor,
      `/*\n* Comment example\n*/\n\n// comment 2\n\npackage number;\n`
    );
    await wait(500);
    await insertText(editor, "java.");
    await autoComplete();
    const documentTransformed = editor?.document.getText();

    await wait(500);
    await closeFile();

    assert.ok(usedRecipeMock.verify());

    assert.strictEqual(
      documentTransformed,
      new vscode.SnippetString(documentJavaRecipeImportsAfterPackageExpected)
        .value
    );
    await updateConfig(pythonUri, originalConfig);
  });

  test("test imports are added after first comments and before next comment in Java", async () => {
    getJavaRecipeStub().returns(mockRecipeJava(javaRecipe));

    const document = await vscode.workspace.openTextDocument(javaUri);
    const editor = await vscode.window.showTextDocument(document);
    await wait(500);
    const originalConfig = await updateConfig(javaUri, configDefaults);

    await insertText(editor, `/*\n* Comment example\n*/\n\n// comment 2\n`);
    await wait(500);
    await insertText(editor, "java.");
    await autoComplete();
    const documentTransformed = editor?.document.getText();

    await wait(500);
    await closeFile();

    assert.ok(usedRecipeMock.verify());

    assert.strictEqual(
      documentTransformed,
      new vscode.SnippetString(documentJavaRecipeImportsBetweenCommentsExpected)
        .value
    );
    await updateConfig(javaUri, originalConfig);
  });
});
