global.isInTestMode = true;

import {Diagnostic} from "vscode-languageserver";
import {createIgnoreFix, provideIgnoreFixCodeActions} from "../diagnostics/ignore-violation";
import * as assert from "assert";
import {TextDocument} from "vscode-languageserver-textdocument";
import {URI, Utils} from "vscode-uri";
import * as os from "os";
import {createRange, createTextDocument} from "./testUtils";

suite("Rosie ignore violation quick fixes", () => {
  const typescriptFileContent =
    "class Duck {\r\n" +
    "  private _size: number;\r\n" +
    "  constructor(size: number) {\r\n" +
    "    this._size = size;\r\n" +
    "  }\r\n" +
    "}\r\n" +
    "const x = 6;";
  const pythonFileContent =
    'def some_function():\r\n' +
    '    y = "some string"\r\n';

  let workspaceFolder: URI;
  let document: TextDocument;

  //Helpers

  /**
   * Validates that fix edits are applied on the target document for the argument Rosie fix,
   * according to the provided expected content.
   *
   * @param diagnostic the diagnostic for which the fix is applied
   * @param expectedContent the file content that is expected after the edits are applied
   */
  async function testFixIsApplied(diagnostic: Diagnostic, expectedContent: string = typescriptFileContent) {
    const codeAction = await createIgnoreFix(diagnostic, document);
    const changes = codeAction.edit?.changes;

    if (changes) {
      assert.strictEqual(TextDocument.applyEdits(document, changes?.[document.uri]), expectedContent);
    } else {
      assert.fail("No Code Action edit change was available.");
    }
  }

  // Hooks

  setup(async () => {
    /*
      Uses an arbitrary URI based on the OS-specific temp directory.
      The actual folder is not created, we only need the URI referencing a folder.
     */
    workspaceFolder = Utils.joinPath(URI.parse(os.tmpdir()), "workspaceFolder");

    //Creates the TextDocument on which the fixes are applied and tested
    document = createTextDocument(workspaceFolder, "typescript.tsx", "typescriptreact", typescriptFileContent);
  });

  // provideIgnoreFixCodeActions

  test("provideIgnoreFixCodeActions: returns no CodeAction for no diagnostic", async () => {
    const range = createRange(0, 2, 0, 6);
    const codeActions = await provideIgnoreFixCodeActions(
      document,
      range,
      {
        textDocument: {uri: document.uri},
        range: range,
        context: {diagnostics: []},
      });

    assert.strictEqual(codeActions.length, 0);
  });

  test("provideIgnoreFixCodeActions: returns no CodeAction for no Codiga diagnostic", async () => {
    const range = createRange(0, 2, 0, 6);
    const codeActions = await provideIgnoreFixCodeActions(
      document,
      range,
      {
        textDocument: {uri: document.uri},
        range: range,
        context: {diagnostics: [{range: range, message: "diagnostic message", source: "notcodiga"}]},
      });

    assert.strictEqual(codeActions.length, 0);
  });

  test("provideIgnoreFixCodeActions: returns CodeActions for Codiga diagnostics", async () => {
    const range = createRange(0, 2, 0, 6);
    const codeActions = await provideIgnoreFixCodeActions(
      document,
      range,
      {
        textDocument: {uri: document.uri},
        range: range,
        context: {
          diagnostics: [
            {range: range, message: "not codiga diagnostic", source: "notcodiga"},
            {range: range, message: "codiga diagnostic", source: "Codiga"}
          ]
        },
      });

    assert.strictEqual(codeActions.length, 1);
  });

  // createIgnoreFix

  test("createIgnoreFix: Adds codiga-disable comment in the first row", async () => {
    await testFixIsApplied({
        range: createRange(0, 2, 0, 6),
        message: "Diagnostic message"
      },
      "// codiga-disable\n" +
      "class Duck {\r\n" +
      "  private _size: number;\r\n" +
      "  constructor(size: number) {\r\n" +
      "    this._size = size;\r\n" +
      "  }\r\n" +
      "}\r\n" +
      "const x = 6;");
  });

  test("createIgnoreFix: Adds codiga-disable comment within the document", async () => {
    await testFixIsApplied(
      {
        range: createRange(3, 2, 3, 10),
        message: "Diagnostic message"
      },
      "class Duck {\r\n" +
      "  private _size: number;\r\n" +
      "  constructor(size: number) {\r\n" +
      "    // codiga-disable\n" +
      "    this._size = size;\r\n" +
      "  }\r\n" +
      "}\r\n" +
      "const x = 6;"
    );
  });

  test("createIgnoreFix: Adds codiga-disable comment for violation in the last row", async () => {
    await testFixIsApplied(
      {
        range: createRange(6, 1, 6, 6),
        message: "Diagnostic message"
      },
      "class Duck {\r\n" +
      "  private _size: number;\r\n" +
      "  constructor(size: number) {\r\n" +
      "    this._size = size;\r\n" +
      "  }\r\n" +
      "}\r\n" +
      "// codiga-disable\n" +
      "const x = 6;"
    );
  });

  test("createIgnoreFix: Adds codiga-disable comment in python file", async () => {
    document = createTextDocument(workspaceFolder, "python.py", "python", pythonFileContent);

    await testFixIsApplied(
      {
        range: createRange(1, 1, 1, 6),
        message: "Diagnostic message"
      },
      "def some_function():\r\n" +
      "    # codiga-disable\n" +
      "    y = \"some string\"\r\n"
    );
  });
});
