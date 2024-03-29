import * as assert from "assert";
import * as vscode from "vscode";
import * as sinon from "sinon";

import * as getRecipesApiCall from "../../../graphql-api/get-recipes-for-client";
import * as usedRecipeApiCAll from "../../../graphql-api/use-recipe";
import { Language } from "../../../graphql-api/types";
import {
  wait,
  closeFile,
  insertText,
  mockRecipe,
  autoComplete,
  recipeWithTransformVariables,
  testDataUri,
  updateConfig,
} from "../../testUtils";

// test there's no recipe variable in the final recipe insertion, we create mocks and stub
// for recipe fetch and recipe usage endpoints
suite("variable transformation test", () => {
  const uri = testDataUri("assistant-completion.rs");

  // a sandbox is required so we stubs and mocks are not mixed with other test suites
  const sandbox = sinon.createSandbox();
  // stub and mock two api calls required for this test suite
  let getRecipeStub: sinon.SinonStub;
  let usedRecipeMock: sinon.SinonExpectation;

  // this is executed before each test
  setup(async () => {
    // define the stub and mock
    getRecipeStub = sandbox
      .stub(getRecipesApiCall, "getRecipesForClientByShorcut")
      .withArgs("spawn.", "assistant-completion.rs", Language.Rust, []);

    usedRecipeMock = sandbox
      .mock(usedRecipeApiCAll)
      .expects("useRecipeCallback")
      .withArgs(42069)
      .once();

    await updateConfig({} as vscode.Uri, {
      "codiga.editor.shortcutCompletion": true,
      "codiga.editor.inlineCompletion": true,
    });
    await wait(2000);
  });

  // this is executed after each test finishes
  teardown(async () => {
    // things get messy really quick, do not remove this step
    sandbox.restore();

    await updateConfig({} as vscode.Uri, {
      "codiga.editor.shortcutCompletion": false,
      "codiga.editor.inlineCompletion": false,
    });
  });

  test("detect transformation variables are not present", async () => {
    getRecipeStub.returns(mockRecipe(recipeWithTransformVariables));

    const document = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(document);
    await wait(500);

    insertText(editor, "spawn.");
    await autoComplete();
    const documentTransformed = editor?.document.getText();

    await wait(500);
    await closeFile();

    assert.ok(usedRecipeMock.verify());
    // running graphical tests take time, so we check for everything at once
    // instead of creating single 2sec test for each one. Not worth it.
    assert.ok(!documentTransformed.includes("${TM_SELECTED_TEXT}"));
    assert.ok(!documentTransformed.includes("${TM_CURRENT_LINE}"));
    assert.ok(!documentTransformed.includes("${TM_CURRENT_WORD}"));
    assert.ok(!documentTransformed.includes("${TM_LINE_INDEX}"));
    assert.ok(!documentTransformed.includes("${TM_LINE_NUMBER}"));
    assert.ok(!documentTransformed.includes("${TM_FILENAME}"));
    assert.ok(!documentTransformed.includes("${TM_FILENAME_BASE}"));
    assert.ok(!documentTransformed.includes("${TM_DIRECTORY}"));
    assert.ok(!documentTransformed.includes("${TM_FILEPATH}"));
    assert.ok(!documentTransformed.includes("${RELATIVE_FILEPATH}"));
    assert.ok(!documentTransformed.includes("${CLIPBOARD}"));
    assert.ok(!documentTransformed.includes("${WORKSPACE_NAME}"));
    assert.ok(!documentTransformed.includes("${WORKSPACE_FOLDER}"));
    assert.ok(!documentTransformed.includes("${CURRENT_DAY_NAME}"));
    assert.ok(!documentTransformed.includes("${CURRENT_MONTH_NAME}"));
    assert.ok(!documentTransformed.includes("${CURRENT_DAY_NAME_SHORT}"));
    assert.ok(!documentTransformed.includes("${CURRENT_MONTH_NAME_SHORT}"));
    assert.ok(!documentTransformed.includes("${CURRENT_MONTH}"));
    assert.ok(!documentTransformed.includes("${CURRENT_DATE}"));
    assert.ok(!documentTransformed.includes("${CURRENT_YEAR}"));
    assert.ok(!documentTransformed.includes("${CURRENT_YEAR_SHORT}"));
    assert.ok(!documentTransformed.includes("${CURRENT_HOUR}"));
    assert.ok(!documentTransformed.includes("${CURRENT_MINUTE}"));
    assert.ok(!documentTransformed.includes("${CURRENT_SECOND}"));
    assert.ok(!documentTransformed.includes("${CURRENT_SECONDS_UNIX}"));
    assert.ok(!documentTransformed.includes("${RANDOM}"));
    assert.ok(!documentTransformed.includes("${RANDOM_HEX}"));
    assert.ok(!documentTransformed.includes("${UUID}"));
    assert.ok(!documentTransformed.includes("${BLOCK_COMMENT_START}"));
    assert.ok(!documentTransformed.includes("${BLOCK_COMMENT_END}"));
    assert.ok(!documentTransformed.includes("${LINE_COMMENT}"));
  });
});
