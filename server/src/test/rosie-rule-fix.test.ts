global.isInTestMode = true;

import * as assert from "assert";
import {createRuleFix, createAndSetRuleFixCodeActionEdit} from "../rosie/rosiefix";
import {RosieFix} from "../rosie/rosieTypes";
import {TextDocument} from "vscode-languageserver-textdocument";
import {URI, Utils} from "vscode-uri";
import * as os from "os";
import {createTextDocument} from "./testUtils";

suite("Rosie rule fix quick fixes", () => {
  const typescriptFileContent =
    "class Duck {\r\n" +
    "  private _size: number;\r\n" +
    "  constructor(size: number) {\r\n" +
    "    this._size = size;\r\n" +
    "  }\r\n" +
    "}\r\n" +
    "const x = 6;";
  let workspaceFolder: URI;
  let document: TextDocument;

  // Helpers

  /**
   * Validates that no fix edit is applied on the target document for the argument Rosie fix.
   *
   * @param rosieFix the Rosie fix
   */
  function testNoFixIsApplied(rosieFix: RosieFix) {
    testFix(rosieFix);
  }

  /**
   * Validates that fix edits is applied on the target document for the argument Rosie fix,
   * according to the provided expected content.
   *
   * @param rosieFix the Rosie fix
   * @param expectedContent the file content that is expected after the edits are applied
   */
  function testFixIsApplied(rosieFix: RosieFix, expectedContent: string) {
    testFix(rosieFix, expectedContent);
  }

  function testFix(rosieFix: RosieFix, expectedContent: string = typescriptFileContent) {
    const codeAction = createRuleFix(document, rosieFix);
    createAndSetRuleFixCodeActionEdit(codeAction, document, rosieFix.edits);
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

  // Test cases

  test("No fix is applied when no Rosie edit is available", async () => {
    testNoFixIsApplied({description: "A fix without edits", edits: []});
  });

  test("No fix is applied when start line is negative for addition", async () => {
    testNoFixIsApplied({
      description: "Addition fix",
      edits: [
        {
          content: "Text added",
          editType: "add",
          start: {line: 0, col: 5},
          end: {line: 1, col: 10}
        }
      ]
    });
  });

  test("No fix is applied when start position is negative for addition", async () => {
    testNoFixIsApplied({
      description: "Addition fix",
      edits: [
        {
          content: "Text added",
          editType: "add",
          start: {line: 1, col: -5},
          end: {line: 1, col: 10}
        }
      ]
    });
  });

  // This is the behaviour on VS Code/language server side and not on Codiga side
  test("Adds text at the end of the document when start line is beyond document length", async () => {
    testFixIsApplied(
      {
        description: "Addition fix",
        edits: [
          {
            content: "Text added",
            editType: "add",
            start: {line: 10, col: 5},
            end: {line: 1, col: 10}
          }
        ]
      },
      "class Duck {\r\n" +
        "  private _size: number;\r\n" +
        "  constructor(size: number) {\r\n" +
        "    this._size = size;\r\n" +
        "  }\r\n" +
        "}\r\n" +
        "const x = 6;Text added");
  });

  // This is the behaviour on VS Code/language server side and not on Codiga side
  test("Adds text at the end of the document when start position is beyond document length", async () => {
    testFixIsApplied(
      {
        description: "Addition fix",
        edits: [
          {
            content: "Text added",
            editType: "add",
            start: {line: 7, col: 25},
            end: {line: 1, col: 10}
          }
        ]
      },
      "class Duck {\r\n" +
        "  private _size: number;\r\n" +
        "  constructor(size: number) {\r\n" +
        "    this._size = size;\r\n" +
        "  }\r\n" +
        "}\r\n" +
        "const x = 6;Text added");
  });

  test("No fix is applied when start line is negative for non-addition", async () => {
    testNoFixIsApplied({
      description: "Removal fix",
      edits: [
        {
          content: "Removal",
          editType: "remove",
          start: {line: 0, col: 5},
          end: {line: 1, col: 10}
        }
      ]
    });
  });

  test("No fix is applied when start position is negative for non-addition", async () => {
    testNoFixIsApplied({
      description: "Removal fix",
      edits: [
        {
          content: "Removal",
          editType: "remove",
          start: {line: 1, col: -5},
          end: {line: 1, col: 10}
        }
      ]
    });
  });

  test("No fix is applied when start line is beyond document length for removal", async () => {
    testNoFixIsApplied({
      description: "Removal fix",
      edits: [
        {
          content: "Removal",
          editType: "remove",
          start: {line: 10, col: 5},
          end: {line: 10, col: 10}
        }
      ]
    });
  });

  test("No fix is applied when start position is beyond document length for non-addition", async () => {
    testNoFixIsApplied({
      description: "Removal fix",
      edits: [
        {
          content: "Removal",
          editType: "remove",
          start: {line: 7, col: 25},
          end: {line: 7, col: 30}
        }
      ]
    });
  });

  test("No fix is applied when end line is negative", async () => {
    testNoFixIsApplied({
      description: "Removal fix",
      edits: [
        {
          content: "Removal",
          editType: "remove",
          start: {line: 1, col: 5},
          end: {line: 0, col: 10}
        }
      ]
    });
  });

  test("No fix is applied when end position is negative", async () => {
    testNoFixIsApplied({
      description: "Removal fix",
      edits: [
        {
          content: "Removal",
          editType: "remove",
          start: {line: 1, col: 5},
          end: {line: 1, col: -10}
        }
      ]
    });
  });

  // This is the behaviour on VS Code/language server side and not on Codiga side
  test("Replaces text at the end of the document when end position is beyond document length", async () => {
    testFixIsApplied(
      {
        description: "Replacement fix",
        edits: [
          {
            content: "Replacement",
            editType: "update",
            start: {line: 7, col: 1},
            end: {line: 7, col: 50}
          }
        ]
      },
      "class Duck {\r\n" +
        "  private _size: number;\r\n" +
        "  constructor(size: number) {\r\n" +
        "    this._size = size;\r\n" +
        "  }\r\n" +
        "}\r\n" +
        "Replacement");
  });

  test("No fix is applied when end position is less than start position", async () => {
    testNoFixIsApplied(
      {
        description: "Replacement fix",
        edits: [
          {
            content: "Replacement",
            editType: "update",
            start: {line: 4, col: 5},
            end: {line: 2, col: 10}
          }
        ]
      });
  });

  test("Adds text", async () => {
    testFixIsApplied(
      {
        description: "Addition fix",
        edits: [
          {
            content: "Text added",
            editType: "add",
            start: {line: 1, col: 5},
            end: {line: 1, col: 10}
          }
        ]
      },
      "clasText addeds Duck {\r\n" +
        "  private _size: number;\r\n" +
        "  constructor(size: number) {\r\n" +
        "    this._size = size;\r\n" +
        "  }\r\n" +
        "}\r\n" +
        "const x = 6;");
  });

  test("Replaces text", async () => {
    testFixIsApplied(
      {
        description: "Replacement fix",
        edits: [
          {
            content: "Replacement",
            editType: "update",
            start: {line: 1, col: 5},
            end: {line: 1, col: 10}
          }
        ]
      },
      "clasReplacementk {\r\n" +
        "  private _size: number;\r\n" +
        "  constructor(size: number) {\r\n" +
        "    this._size = size;\r\n" +
        "  }\r\n" +
        "}\r\n" +
        "const x = 6;");
  });

  test("Replaces text at the end of the document", async () => {
    testFixIsApplied(
      {
        description: "Replacement fix",
        edits: [
          {
            content: "Replacement",
            editType: "update",
            start: {line: 7, col: 3},
            end: {line: 7, col: 13}
          }
        ]
      },
      "class Duck {\r\n" +
        "  private _size: number;\r\n" +
        "  constructor(size: number) {\r\n" +
        "    this._size = size;\r\n" +
        "  }\r\n" +
        "}\r\n" +
        "coReplacement");
  });

  test("Deletes text", async () => {
    testFixIsApplied(
      {
        description: "Removal fix",
        edits: [
          {
            content: "Removal",
            editType: "remove",
            start: {line: 1, col: 5},
            end: {line: 1, col: 10}
          }
        ]
      },
      "clask {\r\n" +
        "  private _size: number;\r\n" +
        "  constructor(size: number) {\r\n" +
        "    this._size = size;\r\n" +
        "  }\r\n" +
        "}\r\n" +
        "const x = 6;");
  });

  test("Deletes text at the end of the document", async () => {
    testFixIsApplied(
      {
        description: "Removal fix",
        edits: [
          {
            content: "Removal",
            editType: "remove",
            start: {line: 7, col: 3},
            end: {line: 7, col: 13}
          }
        ]
      },
      "class Duck {\r\n" +
        "  private _size: number;\r\n" +
        "  constructor(size: number) {\r\n" +
        "    this._size = size;\r\n" +
        "  }\r\n" +
        "}\r\n" +
        "co");
  });


  test("Applies multiple edits, also excluding edits with unknown edit types", async () => {
    testFixIsApplied(
      {
        description: "Multi-edit fix",
        edits: [
          {
            content: "Removal",
            editType: "remove",
            start: {line: 7, col: 3},
            end: {line: 7, col: 13}
          },
          {
            content: "Replacement",
            editType: "update",
            start: {line: 2, col: 2},
            end: {line: 2, col: 6}
          },
          {
            content: "Unknown",
            editType: "unknown",
            start: {line: 4, col: 3},
            end: {line: 4, col: 8}
          }
        ]
      },
      "class Duck {\r\n" +
        " Replacementvate _size: number;\r\n" +
        "  constructor(size: number) {\r\n" +
        "    this._size = size;\r\n" +
        "  }\r\n" +
        "}\r\n" +
        "co");
  });

  test("Replaces text in multiple lines", async () => {
    testFixIsApplied(
      {
        description: "Replacement fix",
        edits: [
          {
            content: "Replacement",
            editType: "update",
            start: {line: 1, col: 1},
            end: {line: 3, col: 5}
          }
        ]
      },
      "Replacementnstructor(size: number) {\r\n" +
        "    this._size = size;\r\n" +
        "  }\r\n" +
        "}\r\n" +
        "const x = 6;");
  });

  test("Deletes text in multiple lines", async () => {
    testFixIsApplied(
      {
        description: "Removal fix",
        edits: [
          {
            content: "Removal",
            editType: "remove",
            start: {line: 1, col: 1},
            end: {line: 3, col: 5}
          }
        ]
      },
      "nstructor(size: number) {\r\n" +
        "    this._size = size;\r\n" +
        "  }\r\n" +
        "}\r\n" +
        "const x = 6;");
  });
});
