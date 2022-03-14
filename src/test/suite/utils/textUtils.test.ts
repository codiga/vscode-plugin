import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import { Language } from "../../../graphql-api/types";
import {
  removeStartingSlashOrDot,
  shouldSkipSuggestions,
} from "../../../utils/textUtils";

suite("textUtils.ts test", () => {
  vscode.window.showInformationMessage("Start fileUtils tests.");

  test("correctly skip when there is more than one element", () => {
    assert(shouldSkipSuggestions("foo bar", "bar", Language.C) === true);
    assert(
      shouldSkipSuggestions("baz    /foobar", "/foobar", Language.C) === true
    );
    assert(
      shouldSkipSuggestions("baz    .foobar", ".foobar", Language.C) === true
    );

    assert(shouldSkipSuggestions("/foobar", "/foobar", Language.C) === false);
    assert(
      shouldSkipSuggestions("    /foobar", "/foobar", Language.C) === false
    );
    assert(shouldSkipSuggestions(".foobar", ".foobar", Language.C) === false);
    assert(
      shouldSkipSuggestions("    .foobar", ".foobar", Language.C) === false
    );
  });

  test("skip if the element is a comment", () => {
    assert(shouldSkipSuggestions("// foobar", "foobar", Language.C));
    assert(shouldSkipSuggestions("/* foobar", "foobar", Language.C));
  });

  test("correctly remove slash or dot from term", () => {
    assert.strictEqual(removeStartingSlashOrDot("/foobar"), "foobar");
    assert.strictEqual(removeStartingSlashOrDot(".foobar"), "foobar");
    assert.strictEqual(removeStartingSlashOrDot("foo/bar"), "foo/bar");
    assert.strictEqual(removeStartingSlashOrDot("foo.bar"), "foo.bar");
  });
});
