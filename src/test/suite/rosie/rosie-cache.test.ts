import * as assert from "assert";
import * as vscode from "vscode";
import {createMockRule, getWorkspaceFolder, testDataUri, testDataUriInWorkspace} from "../../testUtils";
import {
  CacheData,
  filterRules,
  garbageCollection,
  getRosieRulesForLanguage,
  getRulesetsFromYamlFile,
  getRulesFromCache,
  refreshCacheForWorkspace,
} from "../../../rosie/rosieCache";
import * as fs from "fs";
import {Language} from "../../../graphql-api/types";

suite("Rosie cache", () => {

  let codigaYaml: vscode.Uri;

  async function createCodigaYml(content: string) {
    codigaYaml = vscode.Uri.joinPath((await getWorkspaceFolder()).uri, "codiga.yml");
    const codigaFileContent = Buffer.from(content, "utf-8");
    await vscode.workspace.fs.writeFile(codigaYaml, codigaFileContent);
  }

  // Hooks

  teardown(async () => {
    //When `codigaYaml.fsPath` is equal to codiga.yml, that is an untitled document not existing on the file system.
    if (codigaYaml && fs.existsSync(codigaYaml.fsPath) && codigaYaml.fsPath !== "codiga.yml")
      await vscode.workspace.fs.delete(codigaYaml);
  });

  // garbageCollection

  test("garbageCollection: deletes outdated workspace from cache", async () => {
    const cache = new Map<vscode.WorkspaceFolder, CacheData>();
    const workspace = await getWorkspaceFolder();
    cache.set(workspace, {
      fileLastModification: 0,
      lastRefreshed: Date.now() - 60 * 11 * 1000, //eleven minutes ago
      lastTimestamp: 0,
      rules: []
    });
    garbageCollection(cache);

    assert.strictEqual(cache.has(workspace), false);
  });

  test("garbageCollection: doesn't delete non-outdated workspace from cache", async () => {
    const cache = new Map<vscode.WorkspaceFolder, CacheData>();
    const workspace = await getWorkspaceFolder();
    cache.set(workspace, {
      fileLastModification: 0,
      lastRefreshed: Date.now(),
      lastTimestamp: 0,
      rules: []
    });
    garbageCollection(cache);

    assert.strictEqual(cache.has(workspace), true);
  });

  // getRulesetsFromYamlFile

  test("getRulesetsFromYamlFile: returns empty array when no codiga.yml exists", async () => {
    //Testing non-existent codiga.yml with an untitled document, that does not automatically exist in the workspace.
    codigaYaml = testDataUri("codiga.yml");

    const rulesets = await getRulesetsFromYamlFile(codigaYaml);

    assert.strictEqual(rulesets.length, 0);
  });

  test("getRulesetsFromYamlFile: returns empty array when codiga.yml is empty", async () => {
    await createCodigaYml("");

    const rulesets = await getRulesetsFromYamlFile(codigaYaml);

    assert.strictEqual(rulesets.length, 0);
  });

  test("getRulesetsFromYamlFile: returns empty array when there is no rulesets property in the file", async () => {
    await createCodigaYml("rules:");

    const rulesets = await getRulesetsFromYamlFile(codigaYaml);

    assert.strictEqual(rulesets.length, 0);
  });

  test("getRulesetsFromYamlFile: returns ruleset names", async () => {
    await createCodigaYml("rulesets:\n  - a-ruleset\n  - another-ruleset");

    const rulesets = await getRulesetsFromYamlFile(codigaYaml);

    assert.strictEqual(rulesets.length, 2);
    assert.strictEqual(rulesets[0], "a-ruleset");
    assert.strictEqual(rulesets[1], "another-ruleset");
  });

  test("getRulesetsFromYamlFile: returns top-level properties as ruleset names", async () => {
    await createCodigaYml("rulesets:\n  - a-ruleset\n  - not-ruleset\n    - nested-property");

    const rulesets = await getRulesetsFromYamlFile(codigaYaml);

    assert.strictEqual(rulesets.length, 1);
    assert.strictEqual(rulesets[0], "a-ruleset");
  });

  // filterRules

  test("filterRules: returns empty array when no rule is provided", async () => {
    const rules = filterRules([Language.Python], []);

    assert.strictEqual(rules.length, 0);
  });

  test("filterRules: returns empty array when no language is provided", async () => {
    const rules = filterRules([], [createMockRule("", "python")]);

    assert.strictEqual(rules.length, 0);
  });

  test("filterRules: returns rules for a single input language", async () => {
    const rules = filterRules(
      [Language.Python],
      [
        createMockRule("", "python"),
        createMockRule("", "javascript")
      ]);

    assert.strictEqual(rules.length, 1);
    assert.strictEqual(rules[0].language, "python");
  });

  test("filterRules: returns rules for multiple input languages", async () => {
    const rules = filterRules(
      [Language.Python, Language.Javascript],
      [
        createMockRule("", "python"),
        createMockRule("", "javascript"),
        createMockRule("", "typescript")
      ]);

    assert.strictEqual(rules.length, 2);
    assert.strictEqual(rules[0].language, "python");
    assert.strictEqual(rules[1].language, "javascript");
  });

  // getRosieRulesForLanguage

  test("getRosieRulesForLanguage: returns empty array for no rule provided", async () => {
    const rules = getRosieRulesForLanguage(Language.Python, []);

    assert.strictEqual(rules.length, 0);
  });

  test("getRosieRulesForLanguage: returns empty array for unsupported language", async () => {
    const rules = getRosieRulesForLanguage(Language.Docker, [createMockRule("", "python")]);

    assert.strictEqual(rules.length, 0);
  });

  test("getRosieRulesForLanguage: returns rules for Python", async () => {
    const rules = getRosieRulesForLanguage(Language.Python,
      [
        createMockRule("", "python"),
        createMockRule("", "javascript")
      ]);

    assert.strictEqual(rules.length, 1);
    assert.strictEqual(rules[0].language, "python");
  });

  test("getRosieRulesForLanguage: returns rules for JavaScript", async () => {
    const rules = getRosieRulesForLanguage(Language.Javascript,
      [
        createMockRule("", "python"),
        createMockRule("", "javascript")
      ]);

    assert.strictEqual(rules.length, 1);
    assert.strictEqual(rules[0].language, "javascript");
  });

  test("getRosieRulesForLanguage: returns union of JS and TS rules for TypeScript", async () => {
    const rules = getRosieRulesForLanguage(Language.Typescript,
      [
        createMockRule("", "python"),
        createMockRule("", "javascript"),
        createMockRule("", "typescript")
      ]);

    assert.strictEqual(rules.length, 2);
    assert.strictEqual(rules[0].language, "javascript");
    assert.strictEqual(rules[1].language, "typescript");
  });

  // getRulesFromCache

  test("getRulesFromCache: returns empty array when there is no workspace for the document", async () => {
    //text_file.txt is not present in the workspace
    const fileUri = await testDataUri("text_file.txt");
    const file = await vscode.workspace.openTextDocument(fileUri);

    const rules = await getRulesFromCache(file);
    assert.strictEqual(rules.length, 0);
  });

  test("getRulesFromCache: returns empty array when rules cache doesn't have the workspace stored", async () => {
    const fileUri = await testDataUriInWorkspace("python_file.py");
    const file = await vscode.workspace.openTextDocument(fileUri);

    const rules = await getRulesFromCache(file);
    assert.strictEqual(rules.length, 0);
  });

  test("getRulesFromCache: returns empty array when rules cache doesn't have rule for a workspace", async () => {
    const workspaceFolder = await getWorkspaceFolder();
    const cacheData: CacheData = {
      lastRefreshed: 0,
      lastTimestamp: 1,
      fileLastModification: 0,
      rules: [createMockRule("", "typescript")]
    };
    await refreshCacheForWorkspace(workspaceFolder, cacheData);

    const fileUri = await testDataUriInWorkspace("python_file.py");
    const file = await vscode.workspace.openTextDocument(fileUri);

    const rules = await getRulesFromCache(file);
    assert.strictEqual(rules.length, 0);
  });

  test("getRulesFromCache: returns empty array for document with unsupported language", async () => {
    const workspaceFolder = await getWorkspaceFolder();
    const cacheData: CacheData = {
      lastRefreshed: 0,
      lastTimestamp: 1,
      fileLastModification: 0,
      rules: [createMockRule("", "python")]
    };
    await refreshCacheForWorkspace(workspaceFolder, cacheData);

    const fileUri = await testDataUriInWorkspace("unsupported.configuration");
    const file = await vscode.workspace.openTextDocument(fileUri);

    const rules = await getRulesFromCache(file);
    assert.strictEqual(rules.length, 0);
  });

  test("getRulesFromCache: returns rules for document", async () => {
    const workspaceFolder = await getWorkspaceFolder();
    const cacheData: CacheData = {
      lastRefreshed: 0,
      lastTimestamp: 1,
      fileLastModification: 0,
      rules: [
        createMockRule("", "python"),
        createMockRule("", "javascript"),
        createMockRule("", "python")
      ]
    };
    await refreshCacheForWorkspace(workspaceFolder, cacheData);

    const fileUri = await testDataUriInWorkspace("python_file.py");
    const file = await vscode.workspace.openTextDocument(fileUri);

    const rules = await getRulesFromCache(file);
    assert.strictEqual(rules.length, 2);
    assert.strictEqual(rules[0].language, "python");
    assert.strictEqual(rules[1].language, "python");
  });
});
