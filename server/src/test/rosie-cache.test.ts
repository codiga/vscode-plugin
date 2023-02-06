global.isInTestMode = true;

import * as assert from "assert";
import {
  createCacheData,
  createCodigaYml,
  createMockPythonRule,
  createMockRule,
  createTextDocument,
  initWorkspaceFolder
} from "./testUtils";
import {
  CacheData,
  filterRules,
  garbageCollection,
  getRosieRules,
  parseCodigaConfig,
  getRulesFromCache,
  refreshCacheForWorkspace, CodigaYmlConfig,
} from "../rosie/rosieCache";
import * as fs from "fs";
import {Language} from "../graphql-api/types";
import {Rule} from "../rosie/rosieTypes";
import {URI as vsUri} from 'vscode-uri';
import {URI} from "vscode-languageserver";
import * as path from 'path';
import * as os from "os";

suite("Rosie cache", () => {
  let workspaceFolder: vsUri;
  let codigaYaml: vsUri;

  // Helpers

  /**
   * Creates a CodigaYmlConfig from the provide configuration content and initializes the rules cache
   * based on that config.
   *
   * @param codigaYmlContent the content of the codiga.yml file
   */
  async function initializeRulesCache(codigaYmlContent: string) {
    codigaYaml = await createCodigaYml(workspaceFolder, codigaYmlContent);
    const codigaConfig = await parseCodigaConfig(codigaYaml);
    await refreshCacheForWorkspace(workspaceFolder.path, createCacheData(codigaConfig));
  }

  /**
   * Creates a path URI via vscode-uri for the argument path segments in the current OS specific temp folder.
   *
   * E.g. calling createInWorkspacePath("sub", "dir", "file.py") on Windows will result in
   * /C:\Users\<local user name>\AppData\Local\Temp\workspaceFolder\sub\dir\file.py
   *
   * @param paths the path segments
   */
  function createInWorkspacePath(...paths: string[]): string {
    return vsUri.parse(`file:///${path.join(os.tmpdir(), "workspaceFolder", ...paths)}`).path;
  }

  /**
   * Validates the number of rules and their ids against the argument Rule array.
   */
  function validateRuleCountAndRuleIds(rules: Rule[], count: number, expectedRuleIds: string[]) {
    assert.strictEqual(rules.length, count);

    for (let i = 0; i < rules.length; i++) {
      assert.strictEqual(rules[i].id, expectedRuleIds[i]);
    }
  }

  // Hooks

  setup(async () => {
    //Uses an arbitrary URI based on the OS-specific temp directory.
    workspaceFolder = vsUri.parse(`file:///${path.join(os.tmpdir(), "workspaceFolder")}`);
    console.log(`tmpdir: ${path.join(os.tmpdir(), "workspaceFolder")}`);
    console.log(`workspaceFolder: ${workspaceFolder.path}`);
    initWorkspaceFolder(workspaceFolder);
  });

  teardown(async () => {
    if (codigaYaml && fs.existsSync(codigaYaml.fsPath)) {
      fs.rmSync(codigaYaml.fsPath);
      fs.rmdirSync(workspaceFolder.fsPath);
    }
  });

  // garbageCollection

  test("garbageCollection: deletes outdated workspace from cache", async () => {
    const cache = new Map<URI, CacheData>();
    cache.set(workspaceFolder.path, {
      codigaYmlConfig: CodigaYmlConfig.EMPTY,
      fileLastModification: 0,
      lastRefreshed: Date.now() - 60 * 11 * 1000, //eleven minutes ago
      lastTimestamp: 0,
      rules: []
    });
    garbageCollection(cache);

    assert.strictEqual(cache.has(workspaceFolder.path), false);
  });

  test("garbageCollection: doesn't delete non-outdated workspace from cache", async () => {
    const cache = new Map<URI, CacheData>();
    cache.set(workspaceFolder.path, {
      codigaYmlConfig: CodigaYmlConfig.EMPTY,
      fileLastModification: 0,
      lastRefreshed: Date.now(),
      lastTimestamp: 0,
      rules: []
    });
    garbageCollection(cache);

    assert.strictEqual(cache.has(workspaceFolder.path), true);
  });

  // parseCodigaConfig

  test("parseCodigaConfig: returns empty array when no codiga.yml exists", async () => {
    codigaYaml = vsUri.parse(`file:///C:/codiga.yml`);

    const codigaConfig = await parseCodigaConfig(codigaYaml);

    assert.strictEqual(codigaConfig.rulesetNames.length, 0);
  });

  test("parseCodigaConfig: returns empty array when codiga.yml is empty", async () => {
    codigaYaml = await createCodigaYml(workspaceFolder, "");

    const codigaConfig = await parseCodigaConfig(codigaYaml);

    assert.strictEqual(codigaConfig.rulesetNames.length, 0);
  });

  test("parseCodigaConfig: returns empty array when there is no rulesets property in the file", async () => {
    codigaYaml = await createCodigaYml(workspaceFolder, "rules:");

    const codigaConfig = await parseCodigaConfig(codigaYaml);

    assert.strictEqual(codigaConfig.rulesetNames.length, 0);
  });

  test("parseCodigaConfig: returns ruleset names", async () => {
    codigaYaml = await createCodigaYml(workspaceFolder, "rulesets:\n  - a-ruleset\n  - another-ruleset");

    const codigaConfig = await parseCodigaConfig(codigaYaml);

    assert.strictEqual(codigaConfig.rulesetNames.length, 2);
    assert.strictEqual(codigaConfig.rulesetNames[0], "a-ruleset");
    assert.strictEqual(codigaConfig.rulesetNames[1], "another-ruleset");
  });

  test("parseCodigaConfig: returns top-level properties as ruleset names", async () => {
    codigaYaml = await createCodigaYml(workspaceFolder, "rulesets:\n  - a-ruleset\n  - not-ruleset\n    - nested-property");

    const codigaConfig = await parseCodigaConfig(codigaYaml);

    assert.strictEqual(codigaConfig.rulesetNames.length, 1);
    assert.strictEqual(codigaConfig.rulesetNames[0], "a-ruleset");
  });

  test("parseCodigaConfig: returns empty ignore config for non property ignore", async () => {
    codigaYaml = await createCodigaYml(workspaceFolder,
      "rulesets:\n" +
      "  - my-python-ruleset\n" +
      "  - my-other-ruleset\n" +
      "ignore");

    const codigaConfig = await parseCodigaConfig(codigaYaml);

    assert.strictEqual(codigaConfig, CodigaYmlConfig.EMPTY);
  });

  test("parseCodigaConfig: returns ignore config for no ignore item", async () => {
    codigaYaml = await createCodigaYml(workspaceFolder,
      "rulesets:\n" +
      "  - my-python-ruleset\n" +
      "  - my-other-ruleset\n" +
      "ignore:");

    const codigaConfig = await parseCodigaConfig(codigaYaml);

    assert.notStrictEqual(codigaConfig, CodigaYmlConfig.EMPTY);
    assert.strictEqual(codigaConfig.ignore.size, 0);
  });

  test("parseCodigaConfig: returnsIgnoreConfigForBlankIgnoreItem", async () => {
    codigaYaml = await createCodigaYml(workspaceFolder,
      "rulesets:\n" +
      "  - my-python-ruleset\n" +
      "  - my-other-ruleset\n" +
      "ignore:\n" +
      "  - ");

    const codigaConfig = await parseCodigaConfig(codigaYaml);

    assert.notStrictEqual(codigaConfig, CodigaYmlConfig.EMPTY);
    assert.strictEqual(codigaConfig.ignore.size, 0);
  });

  test("parseCodigaConfig: returns empty ignore config for string ignore item", async () => {
    codigaYaml = await createCodigaYml(workspaceFolder,
      "rulesets:\n" +
      "  - my-python-ruleset\n" +
      "  - my-other-ruleset\n" +
      "ignore:\n" +
      "  - my-python-ruleset");

    const codigaConfig = await parseCodigaConfig(codigaYaml);

    assert.notStrictEqual(codigaConfig, CodigaYmlConfig.EMPTY);
    assert.strictEqual(codigaConfig.rulesetNames.length, 2);
    assert.strictEqual(codigaConfig.ignore.size, 0);
  });

  test("parseCodigaConfig: return ignore config for empty ruleset name ignore property", async () => {
    codigaYaml = await createCodigaYml(workspaceFolder,
      "rulesets:\n" +
      "  - my-python-ruleset\n" +
      "  - my-other-ruleset\n" +
      "ignore:\n" +
      "  - my-python-ruleset:");

    const codigaConfig = await parseCodigaConfig(codigaYaml);

    assert.notStrictEqual(codigaConfig, CodigaYmlConfig.EMPTY);
    assert.strictEqual(codigaConfig.ignore.size, 1);
    assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.size, 0);
  });

  test("parseCodigaConfig: returns ignore config for string rule name ignore property", async () => {
    codigaYaml = await createCodigaYml(workspaceFolder,
      "rulesets:\n" +
      "  - my-python-ruleset\n" +
      "  - my-other-ruleset\n" +
      "ignore:\n" +
      "  - my-python-ruleset:\n" +
      "    - rule1");

    const codigaConfig = await parseCodigaConfig(codigaYaml);

    assert.notStrictEqual(codigaConfig, CodigaYmlConfig.EMPTY);
    assert.strictEqual(codigaConfig.ignore.size, 1);
    assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.size, 1);
    assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes.length, 0);
  });

  test("parseCodigaConfig: returns ignore config for empty rule name ignore property", async () => {
    codigaYaml = await createCodigaYml(workspaceFolder,
      "rulesets:\n" +
      "  - my-python-ruleset\n" +
      "  - my-other-ruleset\n" +
      "ignore:\n" +
      "  - my-python-ruleset:\n" +
      "    - rule1:");

    const codigaConfig = await parseCodigaConfig(codigaYaml);

    assert.notStrictEqual(codigaConfig, CodigaYmlConfig.EMPTY);
    assert.strictEqual(codigaConfig.ignore.size, 1);
    assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.size, 1);
    assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes.length, 0);
  });

  test("parseCodigaConfig: returns ignore config for string prefix ignore property", async () => {
    codigaYaml = await createCodigaYml(workspaceFolder,
      "rulesets:\n" +
      "  - my-python-ruleset\n" +
      "  - my-other-ruleset\n" +
      "ignore:\n" +
      "  - my-python-ruleset:\n" +
      "    - rule1:\n" +
      "      - prefix");

    const codigaConfig = await parseCodigaConfig(codigaYaml);

    assert.notStrictEqual(codigaConfig, CodigaYmlConfig.EMPTY);
    assert.strictEqual(codigaConfig.ignore.size, 1);
    assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.size, 1);
    assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes.length, 0);
  });

  test("parseCodigaConfig: returns ignore config for empty prefix ignore property", async () => {
    codigaYaml = await createCodigaYml(workspaceFolder,
      "rulesets:\n" +
      "  - my-python-ruleset\n" +
      "  - my-other-ruleset\n" +
      "ignore:\n" +
      "  - my-python-ruleset:\n" +
      "    - rule1:\n" +
      "      - prefix:");

    const codigaConfig = await parseCodigaConfig(codigaYaml);

    assert.notStrictEqual(codigaConfig, CodigaYmlConfig.EMPTY);
    assert.strictEqual(codigaConfig.ignore.size, 1);
    assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.size, 1);
    assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes.length, 0);
  });

  test("parseCodigaConfig: returns ignore config for blank prefix", async () => {
    codigaYaml = await createCodigaYml(workspaceFolder,
      "rulesets:\n" +
      "  - my-python-ruleset\n" +
      "  - my-other-ruleset\n" +
      "ignore:\n" +
      "  - my-python-ruleset:\n" +
      "    - rule1:\n" +
      "      - prefix:     ");

    const codigaConfig = await parseCodigaConfig(codigaYaml);

    assert.notStrictEqual(codigaConfig, CodigaYmlConfig.EMPTY);
    assert.strictEqual(codigaConfig.ignore.size, 1);
    assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.size, 1);
    assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes.length, 0);
  });

  test("parseCodigaConfig: returns ignore config for single prefix", async () => {
    codigaYaml = await createCodigaYml(workspaceFolder,
      "rulesets:\n" +
      "  - my-python-ruleset\n" +
      "  - my-other-ruleset\n" +
      "ignore:\n" +
      "  - my-python-ruleset:\n" +
      "    - rule1:\n" +
      "      - prefix: /path/to/file/to/ignore");

    const codigaConfig = await parseCodigaConfig(codigaYaml);

    assert.notStrictEqual(codigaConfig, CodigaYmlConfig.EMPTY);
    assert.strictEqual(codigaConfig.ignore.size, 1);
    assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.size, 1);
    assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes.length, 1);
    assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes[0], "/path/to/file/to/ignore");
  });

  test("parseCodigaConfig: returns ignore config for single prefix as list", async () => {
    codigaYaml = await createCodigaYml(workspaceFolder,
      "rulesets:\n" +
      "  - my-python-ruleset\n" +
      "  - my-other-ruleset\n" +
      "ignore:\n" +
      "  - my-python-ruleset:\n" +
      "    - rule1:\n" +
      "      - prefix:\n" +
      "        - /path/to/file/to/ignore");

    const codigaConfig = await parseCodigaConfig(codigaYaml);

    assert.notStrictEqual(codigaConfig, CodigaYmlConfig.EMPTY);
    assert.strictEqual(codigaConfig.ignore.size, 1);
    assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.size, 1);
    assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes.length, 1);
    assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes[0], "/path/to/file/to/ignore");
  });

  test("parseCodigaConfig: returns ignore config for multiple prefixes as list", async () => {
    codigaYaml = await createCodigaYml(workspaceFolder,
      "rulesets:\n" +
      "  - my-python-ruleset\n" +
      "  - my-other-ruleset\n" +
      "ignore:\n" +
      "  - my-python-ruleset:\n" +
      "    - rule1:\n" +
      "      - prefix:\n" +
      "        - /path1\n" +
      "        - /path2");

    const codigaConfig = await parseCodigaConfig(codigaYaml);

    assert.notStrictEqual(codigaConfig, CodigaYmlConfig.EMPTY);
    assert.strictEqual(codigaConfig.ignore.size, 1);
    assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.size, 1);
    assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes.length, 2);
    assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes[0], "/path1");
    assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes[1], "/path2");
  });

  test("parseCodigaConfig: returns ignore config for multiple rule ignores", async () => {
    codigaYaml = await createCodigaYml(workspaceFolder,
      "rulesets:\n" +
      "  - my-python-ruleset\n" +
      "  - my-other-ruleset\n" +
      "ignore:\n" +
      "  - my-python-ruleset:\n" +
      "    - rule1:\n" +
      "      - prefix:\n" +
      "        - /path1\n" +
      "        - /path2\n" +
      "    - rule2");

    const codigaConfig = await parseCodigaConfig(codigaYaml);

    assert.notStrictEqual(codigaConfig, CodigaYmlConfig.EMPTY);
    assert.strictEqual(codigaConfig.ignore.size, 1);
    assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.size, 2);
    assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes.length, 2);
    assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes[0], "/path1");
    assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes[1], "/path2");
    assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule2")?.prefixes.length, 0);
  });

  test("parseCodigaConfig: returns ignore config without rulesets", async () => {
    codigaYaml = await createCodigaYml(workspaceFolder,
      "ignore:\n" +
      "  - my-python-ruleset:\n" +
      "    - rule1:\n" +
      "      - prefix:\n" +
      "        - /path1\n" +
      "        - /path2");

    const codigaConfig = await parseCodigaConfig(codigaYaml);

    assert.notStrictEqual(codigaConfig, CodigaYmlConfig.EMPTY);
    assert.strictEqual(codigaConfig.ignore.size, 1);
    assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.size, 1);
    assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes.length, 2);
    assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes[0], "/path1");
    assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes[1], "/path2");
  });

  test("parseCodigaConfig: returns ignore config for duplicate prefix properties", async () => {
    codigaYaml = await createCodigaYml(workspaceFolder,
      "rulesets:\n" +
      "  - my-python-ruleset\n" +
      "  - my-other-ruleset\n" +
      "ignore:\n" +
      "  - my-python-ruleset:\n" +
      "    - rule1:\n" +
      "      - prefix:\n" +
      "        - /path1\n" +
      "        - /path2\n" +
      "      - prefix: /path3");

    const codigaConfig = await parseCodigaConfig(codigaYaml);

    assert.notStrictEqual(codigaConfig, CodigaYmlConfig.EMPTY);
    assert.strictEqual(codigaConfig.ignore.size, 1);
    assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.size, 1);
    assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes.length, 3);
    assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes[0], "/path1");
    assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes[1], "/path2");
    assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes[2], "/path3");
  });

  test("parseCodigaConfig: returns ignore config for duplicate prefix values", async () => {
    codigaYaml = await createCodigaYml(workspaceFolder,
      "rulesets:\n" +
      "  - my-python-ruleset\n" +
      "  - my-other-ruleset\n" +
      "ignore:\n" +
      "  - my-python-ruleset:\n" +
      "    - rule1:\n" +
      "      - prefix:\n" +
      "        - /path1\n" +
      "        - /path1");

    const codigaConfig = await parseCodigaConfig(codigaYaml);

    assert.notStrictEqual(codigaConfig, CodigaYmlConfig.EMPTY);
    assert.strictEqual(codigaConfig.ignore.size, 1);
    assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.size, 1);
    assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes.length, 1);
    assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes[0], "/path1");
  });

  test("parseCodigaConfig: returns ignore config for multiple ruleset ignores", async () => {
    codigaYaml = await createCodigaYml(workspaceFolder,
      "rulesets:\n" +
      "  - my-python-ruleset\n" +
      "  - my-other-ruleset\n" +
      "ignore:\n" +
      "  - my-python-ruleset:\n" +
      "    - rule1:\n" +
      "      - prefix:\n" +
      "        - /path1\n" +
      "        - /path2\n" +
      "    - rule2\n" +
      "  - my-other-ruleset:\n" +
      "    - rule3:\n" +
      "      - prefix: /another/path");

    const codigaConfig = await parseCodigaConfig(codigaYaml);

    assert.notStrictEqual(codigaConfig, CodigaYmlConfig.EMPTY);
    assert.strictEqual(codigaConfig.ignore.size, 2);

    assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.size, 2);
    assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes.length, 2);
    assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes[0], "/path1");
    assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes[1], "/path2");
    assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule2")?.prefixes.length, 0);

    assert.strictEqual(codigaConfig.ignore.get("my-other-ruleset")?.ruleIgnores.size, 1);
    assert.strictEqual(codigaConfig.ignore.get("my-other-ruleset")?.ruleIgnores.get("rule3")?.prefixes.length, 1);
    assert.strictEqual(codigaConfig.ignore.get("my-other-ruleset")?.ruleIgnores.get("rule3")?.prefixes[0], "/another/path");
  });

  // filterRules

  test("filterRules: returns empty array when no rule is provided", async () => {
    const rules = filterRules([Language.Python], []);

    assert.strictEqual(rules.length, 0);
  });

  test("filterRules: returns empty array when no language is provided", async () => {
    const rules = filterRules([], [createMockPythonRule()]);

    assert.strictEqual(rules.length, 0);
  });

  test("filterRules: returns rules for a single input language", async () => {
    const rules = filterRules(
      [Language.Python],
      [
        createMockPythonRule(),
        createMockRule("javascript")
      ]);

    assert.strictEqual(rules.length, 1);
    assert.strictEqual(rules[0].language, "python");
  });

  test("filterRules: returns rules for multiple input languages", async () => {
    const rules = filterRules(
      [Language.Python, Language.Javascript],
      [
        createMockPythonRule(),
        createMockRule("javascript"),
        createMockRule("typescript")
      ]);

    assert.strictEqual(rules.length, 2);
    assert.strictEqual(rules[0].language, "python");
    assert.strictEqual(rules[1].language, "javascript");
  });

  // getRosieRules

  test("getRosieRules: returns empty array for no rule provided", async () => {
    const pythonFile = createInWorkspacePath("python_file.py");

    const rules = await getRosieRules(Language.Python, [], pythonFile);

    assert.strictEqual(rules.length, 0);
  });

  test("getRosieRules: returns empty array for unsupported language", async () => {
    const dockerfile = createInWorkspacePath("dockerfile");

    const rules = await getRosieRules(Language.Docker, [createMockPythonRule()], dockerfile);

    assert.strictEqual(rules.length, 0);
  });

  test("getRosieRules: returns rules for Python", async () => {
    const pythonFile = createInWorkspacePath("python_file.py");

    const rules = await getRosieRules(Language.Python,
      [
        createMockPythonRule(),
        createMockRule("javascript")
      ], pythonFile);

    assert.strictEqual(rules.length, 1);
    assert.strictEqual(rules[0].language, "python");
  });

  test("getRosieRules: returns rules for JavaScript", async () => {
    const jsFile = createInWorkspacePath("javascript_file.js");

    const rules = await getRosieRules(Language.Javascript,
      [
        createMockPythonRule(),
        createMockRule("javascript")
      ], jsFile);

    assert.strictEqual(rules.length, 1);
    assert.strictEqual(rules[0].language, "javascript");
  });

  test("getRosieRules: returns union of JS and TS rules for TypeScript", async () => {
    const tsFile = createInWorkspacePath("typescript_file.js");

    const rules = await getRosieRules(Language.Typescript,
      [
        createMockPythonRule(),
        createMockRule("javascript"),
        createMockRule("typescript")
      ], tsFile);

    assert.strictEqual(rules.length, 2);
    assert.strictEqual(rules[0].language, "javascript");
    assert.strictEqual(rules[1].language, "typescript");
  });

  test("getRosieRules: should return rules for empty ignore config", async () => {
    await initializeRulesCache(
      "rulesets:\n" +
      "  - python-ruleset");

    const pythonFile = createInWorkspacePath("python_file.py");

    const rules = await getRosieRules(Language.Python,
      [
        createMockPythonRule("python-ruleset", "python_rule_1"),
        createMockPythonRule("python-ruleset", "python_rule_2"),
        createMockPythonRule("python-ruleset", "python_rule_3")
      ], pythonFile);

    validateRuleCountAndRuleIds(rules,
      3,
      ["python-ruleset/python_rule_1", "python-ruleset/python_rule_2", "python-ruleset/python_rule_3"]);
  });

  test("getRosieRules: should not filter rules for ignore config with no ruleset", async () => {
    await initializeRulesCache(
      "rulesets:\n" +
      "  - python-ruleset\n" +
      "ignore:\n" +
      "  ");

    const pythonFile = createInWorkspacePath("python_file.py");

    const rules = await getRosieRules(Language.Python,
      [
        createMockPythonRule("python-ruleset", "python_rule_1"),
        createMockPythonRule("python-ruleset", "python_rule_2"),
        createMockPythonRule("python-ruleset", "python_rule_3")
      ], pythonFile);

    validateRuleCountAndRuleIds(rules,
      3,
      ["python-ruleset/python_rule_1", "python-ruleset/python_rule_2", "python-ruleset/python_rule_3"]);
  });

  test("getRosieRules: should not filter rules for ignore config with no rule", async () => {
    await initializeRulesCache(
      "rulesets:\n" +
      "  - python-ruleset\n" +
      "ignore:\n" +
      "  - python-ruleset:");

    const pythonFile = createInWorkspacePath("python_file.py");

    const rules = await getRosieRules(Language.Python,
      [
        createMockPythonRule("python-ruleset", "python_rule_1"),
        createMockPythonRule("python-ruleset", "python_rule_2"),
        createMockPythonRule("python-ruleset", "python_rule_3")
      ], pythonFile);

    validateRuleCountAndRuleIds(rules,
      3,
      ["python-ruleset/python_rule_1", "python-ruleset/python_rule_2", "python-ruleset/python_rule_3"]);
  });

  test("getRosieRules: should filter rules for ignore config with no prefix", async () => {
    await initializeRulesCache(
      "rulesets:\n" +
      "  - python-ruleset\n" +
      "ignore:\n" +
      "  - python-ruleset:\n" +
      "    - python_rule_2");

    const pythonFile = createInWorkspacePath("python_file.py");

    const rules = await getRosieRules(Language.Python,
      [
        createMockPythonRule("python-ruleset", "python_rule_1"),
        createMockPythonRule("python-ruleset", "python_rule_2"),
        createMockPythonRule("python-ruleset", "python_rule_3")
      ], pythonFile);

    validateRuleCountAndRuleIds(rules,
      2,
      ["python-ruleset/python_rule_1", "python-ruleset/python_rule_3"]);
  });

  test("getRosieRules: should filter rule for ignore config with one matching prefix with leading slash", async () => {
    await initializeRulesCache(
      "rulesets:\n" +
      "  - python-ruleset\n" +
      "ignore:\n" +
      "  - python-ruleset:\n" +
      "    - python_rule_2:\n" +
      "      - prefix: /python");

    const pythonFile = createInWorkspacePath("python_file.py");

    const rules = await getRosieRules(Language.Python,
      [
        createMockPythonRule("python-ruleset", "python_rule_1"),
        createMockPythonRule("python-ruleset", "python_rule_2"),
        createMockPythonRule("python-ruleset", "python_rule_3")
      ], pythonFile);

    validateRuleCountAndRuleIds(rules,
      2,
      ["python-ruleset/python_rule_1", "python-ruleset/python_rule_3"]);
  });

  test("getRosieRules: should filter rules with ignore config with one matching prefix without leading slash", async () => {
    await initializeRulesCache(
      "rulesets:\n" +
      "  - python-ruleset\n" +
      "ignore:\n" +
      "  - python-ruleset:\n" +
      "    - python_rule_2:\n" +
      "      - prefix: python");

    const pythonFile = createInWorkspacePath("python_file.py");

    const rules = await getRosieRules(Language.Python,
      [
        createMockPythonRule("python-ruleset", "python_rule_1"),
        createMockPythonRule("python-ruleset", "python_rule_2"),
        createMockPythonRule("python-ruleset", "python_rule_3")
      ], pythonFile);

    validateRuleCountAndRuleIds(rules,
      2,
      ["python-ruleset/python_rule_1", "python-ruleset/python_rule_3"]);
  });

  test("getRosieRules: should filter rules with ignore config with one matching file path prefix", async () => {
    await initializeRulesCache(
      "rulesets:\n" +
      "  - python-ruleset\n" +
      "ignore:\n" +
      "  - python-ruleset:\n" +
      "    - python_rule_2:\n" +
      "      - prefix: /python_file.py");

    const pythonFile = createInWorkspacePath("python_file.py");

    const rules = await getRosieRules(Language.Python,
      [
        createMockPythonRule("python-ruleset", "python_rule_1"),
        createMockPythonRule("python-ruleset", "python_rule_2"),
        createMockPythonRule("python-ruleset", "python_rule_3")
      ], pythonFile);

    validateRuleCountAndRuleIds(rules,
      2,
      ["python-ruleset/python_rule_1", "python-ruleset/python_rule_3"]);
  });

  test("getRosieRules: should filter rules with ignore config with one matching directory path prefix", async () => {
    await initializeRulesCache(
      "rulesets:\n" +
      "  - python-ruleset\n" +
      "ignore:\n" +
      "  - python-ruleset:\n" +
      "    - python_rule_2:\n" +
      "      - prefix: /directory");

    const pythonFile = createInWorkspacePath("directory", "python_file.py");

    const rules = await getRosieRules(Language.Python,
      [
        createMockPythonRule("python-ruleset", "python_rule_1"),
        createMockPythonRule("python-ruleset", "python_rule_2"),
        createMockPythonRule("python-ruleset", "python_rule_3")
      ], pythonFile);

    validateRuleCountAndRuleIds(rules,
      2,
      ["python-ruleset/python_rule_1", "python-ruleset/python_rule_3"]);
  });

  test("getRosieRules: should not filter rules with ignore config with one prefix not matching", async () => {
    await initializeRulesCache(
      "rulesets:\n" +
      "  - python-ruleset\n" +
      "ignore:\n" +
      "  - python-ruleset:\n" +
      "    - python_rule_2:\n" +
      "      - prefix: not-matching");

    const pythonFile = createInWorkspacePath("python_file.py");

    const rules = await getRosieRules(Language.Python,
      [
        createMockPythonRule("python-ruleset", "python_rule_1"),
        createMockPythonRule("python-ruleset", "python_rule_2"),
        createMockPythonRule("python-ruleset", "python_rule_3")
      ], pythonFile);

    validateRuleCountAndRuleIds(rules,
      3,
      ["python-ruleset/python_rule_1", "python-ruleset/python_rule_2", "python-ruleset/python_rule_3"]);
  });

  test("getRosieRules: should not filter rules with ignore config with one prefix containing double dots", async () => {
    await initializeRulesCache(
      "rulesets:\n" +
      "  - python-ruleset\n" +
      "ignore:\n" +
      "  - python-ruleset:\n" +
      "    - python_rule_2:\n" +
      "      - prefix: python_file..py");

    const pythonFile = createInWorkspacePath("python_file.py");

    const rules = await getRosieRules(Language.Python,
      [
        createMockPythonRule("python-ruleset", "python_rule_1"),
        createMockPythonRule("python-ruleset", "python_rule_2"),
        createMockPythonRule("python-ruleset", "python_rule_3")
      ], pythonFile);

    validateRuleCountAndRuleIds(rules,
      3,
      ["python-ruleset/python_rule_1", "python-ruleset/python_rule_2", "python-ruleset/python_rule_3"]);
  });

  test("getRosieRules: should not filter rules with ignore config with one prefix containing single dot as folder", async () => {
    await initializeRulesCache(
      "rulesets:\n" +
      "  - python-ruleset\n" +
      "ignore:\n" +
      "  - python-ruleset:\n" +
      "    - python_rule_2:\n" +
      "      - prefix: directory/./python_file.py");

    const pythonFile = createInWorkspacePath("directory", "sub", "python_file.py");

    const rules = await getRosieRules(Language.Python,
      [
        createMockPythonRule("python-ruleset", "python_rule_1"),
        createMockPythonRule("python-ruleset", "python_rule_2"),
        createMockPythonRule("python-ruleset", "python_rule_3")
      ], pythonFile);

    validateRuleCountAndRuleIds(rules,
      3,
      ["python-ruleset/python_rule_1", "python-ruleset/python_rule_2", "python-ruleset/python_rule_3"]);
  });

  test("getRosieRules: should not filter rules with ignore config with one prefix containing double dots as folder", async () => {
    await initializeRulesCache(
      "rulesets:\n" +
      "  - python-ruleset\n" +
      "ignore:\n" +
      "  - python-ruleset:\n" +
      "    - python_rule_2:\n" +
      "      - prefix: directory/../python_file.py");

    const pythonFile = createInWorkspacePath("directory", "sub", "python_file.py");

    const rules = await getRosieRules(Language.Python,
      [
        createMockPythonRule("python-ruleset", "python_rule_1"),
        createMockPythonRule("python-ruleset", "python_rule_2"),
        createMockPythonRule("python-ruleset", "python_rule_3")
      ], pythonFile);

    validateRuleCountAndRuleIds(rules,
      3,
      ["python-ruleset/python_rule_1", "python-ruleset/python_rule_2", "python-ruleset/python_rule_3"]);
  });

  test("getRosieRules: should filter rules with ignore config with one matching prefix of multiple", async () => {
    await initializeRulesCache(
      "rulesets:\n" +
      "  - python-ruleset\n" +
      "ignore:\n" +
      "  - python-ruleset:\n" +
      "    - python_rule_2:\n" +
      "      - prefix:\n" +
      "        - not/matching\n" +
      "        - python_file.py");

    const pythonFile = createInWorkspacePath("python_file.py");

    const rules = await getRosieRules(Language.Python,
      [
        createMockPythonRule("python-ruleset", "python_rule_1"),
        createMockPythonRule("python-ruleset", "python_rule_2"),
        createMockPythonRule("python-ruleset", "python_rule_3")
      ], pythonFile);

    validateRuleCountAndRuleIds(rules,
      2,
      ["python-ruleset/python_rule_1", "python-ruleset/python_rule_3"]);
  });

  test("getRosieRules: should filter rules with ignore config with multiple matching prefixes", async () => {
    await initializeRulesCache(
      "rulesets:\n" +
      "  - python-ruleset\n" +
      "ignore:\n" +
      "  - python-ruleset:\n" +
      "    - python_rule_2:\n" +
      "      - prefix:\n" +
      "        - /python\n" +
      "        - python_file.py");

    const pythonFile = createInWorkspacePath("python_file.py");

    const rules = await getRosieRules(Language.Python,
      [
        createMockPythonRule("python-ruleset", "python_rule_1"),
        createMockPythonRule("python-ruleset", "python_rule_2"),
        createMockPythonRule("python-ruleset", "python_rule_3")
      ], pythonFile);

    validateRuleCountAndRuleIds(rules,
      2,
      ["python-ruleset/python_rule_1", "python-ruleset/python_rule_3"]);
  });

  test("getRosieRules: should not filter rules with ignore config with multiple prefixes not matching", async () => {
    await initializeRulesCache(
      "rulesets:\n" +
      "  - python-ruleset\n" +
      "ignore:\n" +
      "  - python-ruleset:\n" +
      "    - python_rule_2:\n" +
      "      - prefix:\n" +
      "        - not-matching\n" +
      "        - also/not/matching");

    const pythonFile = createInWorkspacePath("python_file.py");

    const rules = await getRosieRules(Language.Python,
      [
        createMockPythonRule("python-ruleset", "python_rule_1"),
        createMockPythonRule("python-ruleset", "python_rule_2"),
        createMockPythonRule("python-ruleset", "python_rule_3")
      ], pythonFile);

    validateRuleCountAndRuleIds(rules,
      3,
      ["python-ruleset/python_rule_1", "python-ruleset/python_rule_2", "python-ruleset/python_rule_3"]);
  });

  test("getRosieRules: should filter rules with ignore config with multiple rule ignore configurations", async () => {
    await initializeRulesCache(
      "rulesets:\n" +
      "  - python-ruleset\n" +
      "ignore:\n" +
      "  - python-ruleset:\n" +
      "    - python_rule_2:\n" +
      "      - prefix: python_file..py\n" +
      "    - python_rule_3:\n" +
      "      - prefix:\n" +
      "        - /python_fi");

    const pythonFile = createInWorkspacePath("python_file.py");

    const rules = await getRosieRules(Language.Python,
      [
        createMockPythonRule("python-ruleset", "python_rule_1"),
        createMockPythonRule("python-ruleset", "python_rule_2"),
        createMockPythonRule("python-ruleset", "python_rule_3")
      ], pythonFile);

    validateRuleCountAndRuleIds(rules,
      2,
      ["python-ruleset/python_rule_1", "python-ruleset/python_rule_2"]);
  });

  test("getRosieRules: should not filter rules when rule doesnt belong to ruleset", async () => {
    await initializeRulesCache(
      "rulesets:\n" +
      "  - python-ruleset\n" +
      "ignore:\n" +
      "  - python-ruleset:\n" +
      "    - non_python_rule:\n" +
      "      - prefix: python_file..py");

    const pythonFile = createInWorkspacePath("python_file.py");

    const rules = await getRosieRules(Language.Python,
      [
        createMockPythonRule("python-ruleset", "python_rule_1"),
        createMockPythonRule("python-ruleset", "python_rule_2"),
        createMockPythonRule("python-ruleset", "python_rule_3")
      ], pythonFile);

    validateRuleCountAndRuleIds(rules,
      3,
      ["python-ruleset/python_rule_1", "python-ruleset/python_rule_2", "python-ruleset/python_rule_3"]);
  });

  test("getRosieRules: should not filter rules when ruleset ignore is not present in rulesets property", async () => {
    await initializeRulesCache(
      "rulesets:\n" +
      "  - python-ruleset\n" +
      "ignore:\n" +
      "  - not-configured-ruleset:\n" +
      "    - python_rule_2:\n" +
      "      - prefix: python_file.py");

    const pythonFile = createInWorkspacePath("python_file.py");

    const rules = await getRosieRules(Language.Python,
      [
        createMockPythonRule("python-ruleset", "python_rule_1"),
        createMockPythonRule("python-ruleset", "python_rule_2"),
        createMockPythonRule("python-ruleset", "python_rule_3")
      ], pythonFile);

    validateRuleCountAndRuleIds(rules,
      3,
      ["python-ruleset/python_rule_1", "python-ruleset/python_rule_2", "python-ruleset/python_rule_3"]);
  });

  //getRulesFromCache

  test("getRulesFromCache: returns empty array when there is no workspace for the document", async () => {
    //text_file.txt is not present in the workspace
    const document = createTextDocument(vsUri.parse("file:///C:/workspace"), "text_file.txt");

    const rules = await getRulesFromCache(document);

    assert.strictEqual(rules.length, 0);
  });

  test("getRulesFromCache: returns empty array when rules cache doesn't have the workspace stored", async () => {
    const document = createTextDocument(workspaceFolder, "python_file.py", "python");

    const rules = await getRulesFromCache(document);

    assert.strictEqual(rules.length, 0);
  });

  test("getRulesFromCache: returns empty array when rules cache doesn't have rule for a workspace", async () => {
    await refreshCacheForWorkspace(
      workspaceFolder.path,
      createCacheData(CodigaYmlConfig.EMPTY, [createMockRule("typescript")]));

    const document = createTextDocument(workspaceFolder, "python_file.py", "python");
    const rules = await getRulesFromCache(document);

    assert.strictEqual(rules.length, 0);
  });

  test("getRulesFromCache: returns empty array for document with unsupported language", async () => {
    await refreshCacheForWorkspace(
      workspaceFolder.path,
      createCacheData(CodigaYmlConfig.EMPTY, [createMockPythonRule()]));

    const document = createTextDocument(workspaceFolder, "unsupported.configuration");
    const rules = await getRulesFromCache(document);

    assert.strictEqual(rules.length, 0);
  });

  test("getRulesFromCache: returns rules for document", async () => {
    await refreshCacheForWorkspace(
      workspaceFolder.path,
      createCacheData(CodigaYmlConfig.EMPTY,
        [
          createMockPythonRule(),
          createMockRule("javascript"),
          createMockRule("python")
        ]));

    const document = createTextDocument(workspaceFolder, "python_file.py", "python", "");
    const rules = await getRulesFromCache(document);

    assert.strictEqual(rules.length, 2);
    assert.strictEqual(rules[0].language, "python");
    assert.strictEqual(rules[1].language, "python");
  });
});
