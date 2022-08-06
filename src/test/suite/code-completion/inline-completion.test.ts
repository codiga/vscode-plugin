import * as assert from "assert";

import { shouldAnalyze } from "../../../code-completion/inline-completion";

// test recipe auto complete capabilities of the plugin, we create mocks and stub
// for recipe fetch and recipe usage endpoints
suite("assistant-completion.ts test", () => {
  test("check that we analyze only when we have two words at least", async () => {
    assert.strictEqual(shouldAnalyze("#foo bar"), true);
    assert.strictEqual(shouldAnalyze("//"), false);
    assert.strictEqual(shouldAnalyze("//  "), false);
    assert.strictEqual(shouldAnalyze("//  foo    bar"), true);
    assert.strictEqual(shouldAnalyze("//  foo    "), false);
  });
});
