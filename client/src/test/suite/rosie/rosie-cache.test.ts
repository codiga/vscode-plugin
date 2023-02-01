// import * as assert from "assert";
// import * as vscode from "vscode";
// import {createMockRule, getWorkspaceFolder, testDataUri, testDataUriInWorkspace} from "../../testUtils";
// import {
//   CacheData,
//   filterRules,
//   garbageCollection,
//   getRosieRules,
//   parseCodigaConfig,
//   getRulesFromCache,
//   refreshCacheForWorkspace, CodigaYmlConfig,
// } from "../../../rosie/rosieCache";
// import * as fs from "fs";
// import {Language} from "../../../graphql-api/types";
// import {Rule} from "../../../rosie/rosieTypes";
//
// suite("Rosie cache", () => {
//
//   let codigaYaml: vscode.Uri;
//
//   async function createCodigaYml(content: string) {
//     codigaYaml = vscode.Uri.joinPath((await getWorkspaceFolder()).uri, "codiga.yml");
//     const codigaFileContent = Buffer.from(content, "utf-8");
//     await vscode.workspace.fs.writeFile(codigaYaml, codigaFileContent);
//   }
//
//   function createCacheData(codigaYmlConfig: CodigaYmlConfig) {
//     return {
//       codigaYmlConfig: codigaYmlConfig,
//       rules: [],
//       lastRefreshed: 0,
//       lastTimestamp: 1,
//       fileLastModification: 0
//     };
//   }
//
//   /**
//    * Validates the number of rules and their ids against the argument Rule array.
//    */
//   function validateRuleCountAndRuleIds(rules: Rule[], count: number, expectedRuleIds: string[]) {
//     assert.strictEqual(rules.length, count);
//
//     for (let i = 0; i < rules.length; i++) {
//       assert.strictEqual(rules[i].id, expectedRuleIds[i]);
//     }
//   }
//
//   // Hooks
//
//   teardown(async () => {
//     //When `codigaYaml.fsPath` is equal to codiga.yml, that is an untitled document not existing on the file system.
//     if (codigaYaml && fs.existsSync(codigaYaml.fsPath) && codigaYaml.fsPath !== "c:\\codiga.yml")
//       await vscode.workspace.fs.delete(codigaYaml);
//   });
//
//   // garbageCollection
//
//   test("garbageCollection: deletes outdated workspace from cache", async () => {
//     const cache = new Map<vscode.WorkspaceFolder, CacheData>();
//     const workspace = await getWorkspaceFolder();
//     cache.set(workspace, {
//       codigaYmlConfig: CodigaYmlConfig.EMPTY,
//       fileLastModification: 0,
//       lastRefreshed: Date.now() - 60 * 11 * 1000, //eleven minutes ago
//       lastTimestamp: 0,
//       rules: []
//     });
//     garbageCollection(cache);
//
//     assert.strictEqual(cache.has(workspace), false);
//   });
//
//   test("garbageCollection: doesn't delete non-outdated workspace from cache", async () => {
//     const cache = new Map<vscode.WorkspaceFolder, CacheData>();
//     const workspace = await getWorkspaceFolder();
//     cache.set(workspace, {
//       codigaYmlConfig: CodigaYmlConfig.EMPTY,
//       fileLastModification: 0,
//       lastRefreshed: Date.now(),
//       lastTimestamp: 0,
//       rules: []
//     });
//     garbageCollection(cache);
//
//     assert.strictEqual(cache.has(workspace), true);
//   });
//
//   // parseCodigaConfig
//
//   test("parseCodigaConfig: returns empty array when no codiga.yml exists", async () => {
//     codigaYaml = vscode.Uri.parse(`file:///C:/codiga.yml`);
//
//     const codigaConfig = await parseCodigaConfig(codigaYaml);
//
//     assert.strictEqual(codigaConfig.rulesetNames.length, 0);
//   });
//
//   test("parseCodigaConfig: returns empty array when codiga.yml is empty", async () => {
//     await createCodigaYml("");
//
//     const codigaConfig = await parseCodigaConfig(codigaYaml);
//
//     assert.strictEqual(codigaConfig.rulesetNames.length, 0);
//   });
//
//   test("parseCodigaConfig: returns empty array when there is no rulesets property in the file", async () => {
//     await createCodigaYml("rules:");
//
//     const codigaConfig = await parseCodigaConfig(codigaYaml);
//
//     assert.strictEqual(codigaConfig.rulesetNames.length, 0);
//   });
//
//   test("parseCodigaConfig: returns ruleset names", async () => {
//     await createCodigaYml("rulesets:\n  - a-ruleset\n  - another-ruleset");
//
//     const codigaConfig = await parseCodigaConfig(codigaYaml);
//
//     assert.strictEqual(codigaConfig.rulesetNames.length, 2);
//     assert.strictEqual(codigaConfig.rulesetNames[0], "a-ruleset");
//     assert.strictEqual(codigaConfig.rulesetNames[1], "another-ruleset");
//   });
//
//   test("parseCodigaConfig: returns top-level properties as ruleset names", async () => {
//     await createCodigaYml("rulesets:\n  - a-ruleset\n  - not-ruleset\n    - nested-property");
//
//     const codigaConfig = await parseCodigaConfig(codigaYaml);
//
//     assert.strictEqual(codigaConfig.rulesetNames.length, 1);
//     assert.strictEqual(codigaConfig.rulesetNames[0], "a-ruleset");
//   });
//
//   test("parseCodigaConfig: returns empty ignore config for non property ignore", async () => {
//     await createCodigaYml(
//       "rulesets:\n" +
//       "  - my-python-ruleset\n" +
//       "  - my-other-ruleset\n" +
//       "ignore");
//
//     const codigaConfig = await parseCodigaConfig(codigaYaml);
//
//     assert.strictEqual(codigaConfig, CodigaYmlConfig.EMPTY);
//   });
//
//   test("parseCodigaConfig: returns ignore config for no ignore item", async () => {
//     await createCodigaYml(
//       "rulesets:\n" +
//       "  - my-python-ruleset\n" +
//       "  - my-other-ruleset\n" +
//       "ignore:");
//
//     const codigaConfig = await parseCodigaConfig(codigaYaml);
//
//     assert.notStrictEqual(codigaConfig, CodigaYmlConfig.EMPTY);
//     assert.strictEqual(codigaConfig.ignore.size, 0);
//   });
//
//   test("parseCodigaConfig: returnsIgnoreConfigForBlankIgnoreItem", async () => {
//     await createCodigaYml(
//       "rulesets:\n" +
//       "  - my-python-ruleset\n" +
//       "  - my-other-ruleset\n" +
//       "ignore:\n" +
//       "  - ");
//
//     const codigaConfig = await parseCodigaConfig(codigaYaml);
//
//     assert.notStrictEqual(codigaConfig, CodigaYmlConfig.EMPTY);
//     assert.strictEqual(codigaConfig.ignore.size, 0);
//   });
//
//   test("parseCodigaConfig: returns empty ignore config for string ignore item", async () => {
//     await createCodigaYml(
//       "rulesets:\n" +
//       "  - my-python-ruleset\n" +
//       "  - my-other-ruleset\n" +
//       "ignore:\n" +
//       "  - my-python-ruleset");
//
//     const codigaConfig = await parseCodigaConfig(codigaYaml);
//
//     assert.notStrictEqual(codigaConfig, CodigaYmlConfig.EMPTY);
//     assert.strictEqual(codigaConfig.rulesetNames.length, 2);
//     assert.strictEqual(codigaConfig.ignore.size, 0);
//   });
//
//   test("parseCodigaConfig: return ignore config for empty ruleset name ignore property", async () => {
//     await createCodigaYml(
//       "rulesets:\n" +
//       "  - my-python-ruleset\n" +
//       "  - my-other-ruleset\n" +
//       "ignore:\n" +
//       "  - my-python-ruleset:");
//
//     const codigaConfig = await parseCodigaConfig(codigaYaml);
//
//     assert.notStrictEqual(codigaConfig, CodigaYmlConfig.EMPTY);
//     assert.strictEqual(codigaConfig.ignore.size, 1);
//     assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.size, 0);
//   });
//
//   test("parseCodigaConfig: returns ignore config for string rule name ignore property", async () => {
//     await createCodigaYml(
//       "rulesets:\n" +
//       "  - my-python-ruleset\n" +
//       "  - my-other-ruleset\n" +
//       "ignore:\n" +
//       "  - my-python-ruleset:\n" +
//       "    - rule1");
//
//     const codigaConfig = await parseCodigaConfig(codigaYaml);
//
//     assert.notStrictEqual(codigaConfig, CodigaYmlConfig.EMPTY);
//     assert.strictEqual(codigaConfig.ignore.size, 1);
//     assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.size, 1);
//     assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes.length, 0);
//   });
//
//   test("parseCodigaConfig: returns ignore config for empty rule name ignore property", async () => {
//     await createCodigaYml(
//       "rulesets:\n" +
//       "  - my-python-ruleset\n" +
//       "  - my-other-ruleset\n" +
//       "ignore:\n" +
//       "  - my-python-ruleset:\n" +
//       "    - rule1:");
//
//     const codigaConfig = await parseCodigaConfig(codigaYaml);
//
//     assert.notStrictEqual(codigaConfig, CodigaYmlConfig.EMPTY);
//     assert.strictEqual(codigaConfig.ignore.size, 1);
//     assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.size, 1);
//     assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes.length, 0);
//   });
//
//   test("parseCodigaConfig: returns ignore config for string prefix ignore property", async () => {
//     await createCodigaYml(
//       "rulesets:\n" +
//       "  - my-python-ruleset\n" +
//       "  - my-other-ruleset\n" +
//       "ignore:\n" +
//       "  - my-python-ruleset:\n" +
//       "    - rule1:\n" +
//       "      - prefix");
//
//     const codigaConfig = await parseCodigaConfig(codigaYaml);
//
//     assert.notStrictEqual(codigaConfig, CodigaYmlConfig.EMPTY);
//     assert.strictEqual(codigaConfig.ignore.size, 1);
//     assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.size, 1);
//     assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes.length, 0);
//   });
//
//   test("parseCodigaConfig: returns ignore config for empty prefix ignore property", async () => {
//     await createCodigaYml(
//       "rulesets:\n" +
//       "  - my-python-ruleset\n" +
//       "  - my-other-ruleset\n" +
//       "ignore:\n" +
//       "  - my-python-ruleset:\n" +
//       "    - rule1:\n" +
//       "      - prefix:");
//
//     const codigaConfig = await parseCodigaConfig(codigaYaml);
//
//     assert.notStrictEqual(codigaConfig, CodigaYmlConfig.EMPTY);
//     assert.strictEqual(codigaConfig.ignore.size, 1);
//     assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.size, 1);
//     assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes.length, 0);
//   });
//
//   test("parseCodigaConfig: returns ignore config for blank prefix", async () => {
//     await createCodigaYml(
//       "rulesets:\n" +
//       "  - my-python-ruleset\n" +
//       "  - my-other-ruleset\n" +
//       "ignore:\n" +
//       "  - my-python-ruleset:\n" +
//       "    - rule1:\n" +
//       "      - prefix:     ");
//
//     const codigaConfig = await parseCodigaConfig(codigaYaml);
//
//     assert.notStrictEqual(codigaConfig, CodigaYmlConfig.EMPTY);
//     assert.strictEqual(codigaConfig.ignore.size, 1);
//     assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.size, 1);
//     assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes.length, 0);
//   });
//
//   test("parseCodigaConfig: returns ignore config for single prefix", async () => {
//     await createCodigaYml(
//       "rulesets:\n" +
//       "  - my-python-ruleset\n" +
//       "  - my-other-ruleset\n" +
//       "ignore:\n" +
//       "  - my-python-ruleset:\n" +
//       "    - rule1:\n" +
//       "      - prefix: /path/to/file/to/ignore");
//
//     const codigaConfig = await parseCodigaConfig(codigaYaml);
//
//     assert.notStrictEqual(codigaConfig, CodigaYmlConfig.EMPTY);
//     assert.strictEqual(codigaConfig.ignore.size, 1);
//     assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.size, 1);
//     assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes.length, 1);
//     assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes[0], "/path/to/file/to/ignore");
//   });
//
//   test("parseCodigaConfig: returns ignore config for single prefix as list", async () => {
//     await createCodigaYml(
//       "rulesets:\n" +
//       "  - my-python-ruleset\n" +
//       "  - my-other-ruleset\n" +
//       "ignore:\n" +
//       "  - my-python-ruleset:\n" +
//       "    - rule1:\n" +
//       "      - prefix:\n" +
//       "        - /path/to/file/to/ignore");
//
//     const codigaConfig = await parseCodigaConfig(codigaYaml);
//
//     assert.notStrictEqual(codigaConfig, CodigaYmlConfig.EMPTY);
//     assert.strictEqual(codigaConfig.ignore.size, 1);
//     assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.size, 1);
//     assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes.length, 1);
//     assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes[0], "/path/to/file/to/ignore");
//   });
//
//   test("parseCodigaConfig: returns ignore config for multiple prefixes as list", async () => {
//     await createCodigaYml(
//       "rulesets:\n" +
//       "  - my-python-ruleset\n" +
//       "  - my-other-ruleset\n" +
//       "ignore:\n" +
//       "  - my-python-ruleset:\n" +
//       "    - rule1:\n" +
//       "      - prefix:\n" +
//       "        - /path1\n" +
//       "        - /path2");
//
//     const codigaConfig = await parseCodigaConfig(codigaYaml);
//
//     assert.notStrictEqual(codigaConfig, CodigaYmlConfig.EMPTY);
//     assert.strictEqual(codigaConfig.ignore.size, 1);
//     assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.size, 1);
//     assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes.length, 2);
//     assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes[0], "/path1");
//     assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes[1], "/path2");
//   });
//
//   test("parseCodigaConfig: returns ignore config for multiple rule ignores", async () => {
//     await createCodigaYml(
//       "rulesets:\n" +
//       "  - my-python-ruleset\n" +
//       "  - my-other-ruleset\n" +
//       "ignore:\n" +
//       "  - my-python-ruleset:\n" +
//       "    - rule1:\n" +
//       "      - prefix:\n" +
//       "        - /path1\n" +
//       "        - /path2\n" +
//       "    - rule2");
//
//     const codigaConfig = await parseCodigaConfig(codigaYaml);
//
//     assert.notStrictEqual(codigaConfig, CodigaYmlConfig.EMPTY);
//     assert.strictEqual(codigaConfig.ignore.size, 1);
//     assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.size, 2);
//     assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes.length, 2);
//     assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes[0], "/path1");
//     assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes[1], "/path2");
//     assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule2")?.prefixes.length, 0);
//   });
//
//   test("parseCodigaConfig: returns ignore config without rulesets", async () => {
//     await createCodigaYml(
//       "ignore:\n" +
//       "  - my-python-ruleset:\n" +
//       "    - rule1:\n" +
//       "      - prefix:\n" +
//       "        - /path1\n" +
//       "        - /path2");
//
//     const codigaConfig = await parseCodigaConfig(codigaYaml);
//
//     assert.notStrictEqual(codigaConfig, CodigaYmlConfig.EMPTY);
//     assert.strictEqual(codigaConfig.ignore.size, 1);
//     assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.size, 1);
//     assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes.length, 2);
//     assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes[0], "/path1");
//     assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes[1], "/path2");
//   });
//
//   test("parseCodigaConfig: returns ignore config for duplicate prefix properties", async () => {
//     await createCodigaYml(
//       "rulesets:\n" +
//       "  - my-python-ruleset\n" +
//       "  - my-other-ruleset\n" +
//       "ignore:\n" +
//       "  - my-python-ruleset:\n" +
//       "    - rule1:\n" +
//       "      - prefix:\n" +
//       "        - /path1\n" +
//       "        - /path2\n" +
//       "      - prefix: /path3");
//
//     const codigaConfig = await parseCodigaConfig(codigaYaml);
//
//     assert.notStrictEqual(codigaConfig, CodigaYmlConfig.EMPTY);
//     assert.strictEqual(codigaConfig.ignore.size, 1);
//     assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.size, 1);
//     assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes.length, 3);
//     assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes[0], "/path1");
//     assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes[1], "/path2");
//     assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes[2], "/path3");
//   });
//
//   test("parseCodigaConfig: returns ignore config for duplicate prefix values", async () => {
//     await createCodigaYml(
//       "rulesets:\n" +
//       "  - my-python-ruleset\n" +
//       "  - my-other-ruleset\n" +
//       "ignore:\n" +
//       "  - my-python-ruleset:\n" +
//       "    - rule1:\n" +
//       "      - prefix:\n" +
//       "        - /path1\n" +
//       "        - /path1");
//
//     const codigaConfig = await parseCodigaConfig(codigaYaml);
//
//     assert.notStrictEqual(codigaConfig, CodigaYmlConfig.EMPTY);
//     assert.strictEqual(codigaConfig.ignore.size, 1);
//     assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.size, 1);
//     assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes.length, 1);
//     assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes[0], "/path1");
//   });
//
//   test("parseCodigaConfig: returns ignore config for multiple ruleset ignores", async () => {
//     await createCodigaYml(
//       "rulesets:\n" +
//       "  - my-python-ruleset\n" +
//       "  - my-other-ruleset\n" +
//       "ignore:\n" +
//       "  - my-python-ruleset:\n" +
//       "    - rule1:\n" +
//       "      - prefix:\n" +
//       "        - /path1\n" +
//       "        - /path2\n" +
//       "    - rule2\n" +
//       "  - my-other-ruleset:\n" +
//       "    - rule3:\n" +
//       "      - prefix: /another/path");
//
//     const codigaConfig = await parseCodigaConfig(codigaYaml);
//
//     assert.notStrictEqual(codigaConfig, CodigaYmlConfig.EMPTY);
//     assert.strictEqual(codigaConfig.ignore.size, 2);
//
//     assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.size, 2);
//     assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes.length, 2);
//     assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes[0], "/path1");
//     assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule1")?.prefixes[1], "/path2");
//     assert.strictEqual(codigaConfig.ignore.get("my-python-ruleset")?.ruleIgnores.get("rule2")?.prefixes.length, 0);
//
//     assert.strictEqual(codigaConfig.ignore.get("my-other-ruleset")?.ruleIgnores.size, 1);
//     assert.strictEqual(codigaConfig.ignore.get("my-other-ruleset")?.ruleIgnores.get("rule3")?.prefixes.length, 1);
//     assert.strictEqual(codigaConfig.ignore.get("my-other-ruleset")?.ruleIgnores.get("rule3")?.prefixes[0], "/another/path");
//   });
//
//   // filterRules
//
//   test("filterRules: returns empty array when no rule is provided", async () => {
//     const rules = filterRules([Language.Python], []);
//
//     assert.strictEqual(rules.length, 0);
//   });
//
//   test("filterRules: returns empty array when no language is provided", async () => {
//     const rules = filterRules([], [createMockRule("", "python")]);
//
//     assert.strictEqual(rules.length, 0);
//   });
//
//   test("filterRules: returns rules for a single input language", async () => {
//     const rules = filterRules(
//       [Language.Python],
//       [
//         createMockRule("", "python"),
//         createMockRule("", "javascript")
//       ]);
//
//     assert.strictEqual(rules.length, 1);
//     assert.strictEqual(rules[0].language, "python");
//   });
//
//   test("filterRules: returns rules for multiple input languages", async () => {
//     const rules = filterRules(
//       [Language.Python, Language.Javascript],
//       [
//         createMockRule("", "python"),
//         createMockRule("", "javascript"),
//         createMockRule("", "typescript")
//       ]);
//
//     assert.strictEqual(rules.length, 2);
//     assert.strictEqual(rules[0].language, "python");
//     assert.strictEqual(rules[1].language, "javascript");
//   });
//
//   // getRosieRules
//
//   test("getRosieRules: returns empty array for no rule provided", async () => {
//     const pythonFile = await testDataUriInWorkspace("python_file.py");
//
//     const rules = getRosieRules(Language.Python, [], pythonFile);
//
//     assert.strictEqual(rules.length, 0);
//   });
//
//   test("getRosieRules: returns empty array for unsupported language", async () => {
//     const dockerfile = await testDataUriInWorkspace("dockerfile");
//
//     const rules = getRosieRules(Language.Docker, [createMockRule("", "python")], dockerfile);
//
//     assert.strictEqual(rules.length, 0);
//   });
//
//   test("getRosieRules: returns rules for Python", async () => {
//     const pythonFile = await testDataUriInWorkspace("python_file.py");
//
//     const rules = getRosieRules(Language.Python,
//       [
//         createMockRule("", "python"),
//         createMockRule("", "javascript")
//       ], pythonFile);
//
//     assert.strictEqual(rules.length, 1);
//     assert.strictEqual(rules[0].language, "python");
//   });
//
//   test("getRosieRules: returns rules for JavaScript", async () => {
//     const jsFile = await testDataUriInWorkspace("javascript_file.js");
//
//     const rules = getRosieRules(Language.Javascript,
//       [
//         createMockRule("", "python"),
//         createMockRule("", "javascript")
//       ], jsFile);
//
//     assert.strictEqual(rules.length, 1);
//     assert.strictEqual(rules[0].language, "javascript");
//   });
//
//   test("getRosieRules: returns union of JS and TS rules for TypeScript", async () => {
//     const tsFile = await testDataUriInWorkspace("typescript_file.ts");
//
//     const rules = getRosieRules(Language.Typescript,
//       [
//         createMockRule("", "python"),
//         createMockRule("", "javascript"),
//         createMockRule("", "typescript")
//       ], tsFile);
//
//     assert.strictEqual(rules.length, 2);
//     assert.strictEqual(rules[0].language, "javascript");
//     assert.strictEqual(rules[1].language, "typescript");
//   });
//
//   test("getRosieRules: should return rules for empty ignore config", async () => {
//     await createCodigaYml(
//       "rulesets:\n" +
//       "  - python-ruleset");
//     const codigaConfig = await parseCodigaConfig(codigaYaml);
//     const pythonFile = await testDataUriInWorkspace("python_file.py");
//
//     await refreshCacheForWorkspace(await getWorkspaceFolder(), createCacheData(codigaConfig));
//
//     const rules = getRosieRules(Language.Python,
//       [
//         createMockRule("", "python", "python-ruleset", "python_rule_1"),
//         createMockRule("", "python", "python-ruleset", "python_rule_2"),
//         createMockRule("", "python", "python-ruleset", "python_rule_3")
//       ], pythonFile);
//
//     validateRuleCountAndRuleIds(rules,
//       3,
//     ["python-ruleset/python_rule_1", "python-ruleset/python_rule_2", "python-ruleset/python_rule_3"]);
//   });
//
//   test("getRosieRules: should not filter rules for ignore config with no ruleset", async () => {
//     await createCodigaYml(
//       "rulesets:\n" +
//       "  - python-ruleset\n" +
//       "ignore:\n" +
//       "  ");
//     const codigaConfig = await parseCodigaConfig(codigaYaml);
//     const pythonFile = await testDataUriInWorkspace("python_file.py");
//
//     await refreshCacheForWorkspace(await getWorkspaceFolder(), createCacheData(codigaConfig));
//
//     const rules = getRosieRules(Language.Python,
//       [
//         createMockRule("", "python", "python-ruleset", "python_rule_1"),
//         createMockRule("", "python", "python-ruleset", "python_rule_2"),
//         createMockRule("", "python", "python-ruleset", "python_rule_3")
//       ], pythonFile);
//
//     validateRuleCountAndRuleIds(rules,
//       3,
//       ["python-ruleset/python_rule_1", "python-ruleset/python_rule_2", "python-ruleset/python_rule_3"]);
//   });
//
//   test("getRosieRules: should not filter rules for ignore config with no rule", async () => {
//     await createCodigaYml(
//       "rulesets:\n" +
//       "  - python-ruleset\n" +
//       "ignore:\n" +
//       "  - python-ruleset:");
//     const codigaConfig = await parseCodigaConfig(codigaYaml);
//     const pythonFile = await testDataUriInWorkspace("python_file.py");
//
//     await refreshCacheForWorkspace(await getWorkspaceFolder(), createCacheData(codigaConfig));
//
//     const rules = getRosieRules(Language.Python,
//       [
//         createMockRule("", "python", "python-ruleset", "python_rule_1"),
//         createMockRule("", "python", "python-ruleset", "python_rule_2"),
//         createMockRule("", "python", "python-ruleset", "python_rule_3")
//       ], pythonFile);
//
//     validateRuleCountAndRuleIds(rules,
//       3,
//       ["python-ruleset/python_rule_1", "python-ruleset/python_rule_2", "python-ruleset/python_rule_3"]);
//   });
//
//   test("getRosieRules: should filter rules for ignore config with no prefix", async () => {
//     await createCodigaYml(
//       "rulesets:\n" +
//       "  - python-ruleset\n" +
//       "ignore:\n" +
//       "  - python-ruleset:\n" +
//       "    - python_rule_2");
//     const codigaConfig = await parseCodigaConfig(codigaYaml);
//     const pythonFile = await testDataUriInWorkspace("python_file.py");
//
//     await refreshCacheForWorkspace(await getWorkspaceFolder(), createCacheData(codigaConfig));
//
//     const rules = getRosieRules(Language.Python,
//       [
//         createMockRule("", "python", "python-ruleset", "python_rule_1"),
//         createMockRule("", "python", "python-ruleset", "python_rule_2"),
//         createMockRule("", "python", "python-ruleset", "python_rule_3")
//       ], pythonFile);
//
//     validateRuleCountAndRuleIds(rules,
//       2,
//       ["python-ruleset/python_rule_1", "python-ruleset/python_rule_3"]);
//   });
//
//   test("getRosieRules: should filter rule for ignore config with one matching prefix with leading slash", async () => {
//     await createCodigaYml(
//       "rulesets:\n" +
//       "  - python-ruleset\n" +
//       "ignore:\n" +
//       "  - python-ruleset:\n" +
//       "    - python_rule_2:\n" +
//       "      - prefix: /python");
//     const codigaConfig = await parseCodigaConfig(codigaYaml);
//     const pythonFile = await testDataUriInWorkspace("python_file.py");
//
//     await refreshCacheForWorkspace(await getWorkspaceFolder(), createCacheData(codigaConfig));
//
//     const rules = getRosieRules(Language.Python,
//       [
//         createMockRule("", "python", "python-ruleset", "python_rule_1"),
//         createMockRule("", "python", "python-ruleset", "python_rule_2"),
//         createMockRule("", "python", "python-ruleset", "python_rule_3")
//       ], pythonFile);
//
//     validateRuleCountAndRuleIds(rules,
//       2,
//       ["python-ruleset/python_rule_1", "python-ruleset/python_rule_3"]);
//   });
//
//   test("getRosieRules: should filter rules with ignore config with one matching prefix without leading slash", async () => {
//     await createCodigaYml(
//       "rulesets:\n" +
//       "  - python-ruleset\n" +
//       "ignore:\n" +
//       "  - python-ruleset:\n" +
//       "    - python_rule_2:\n" +
//       "      - prefix: python");
//     const codigaConfig = await parseCodigaConfig(codigaYaml);
//     const pythonFile = await testDataUriInWorkspace("python_file.py");
//
//     await refreshCacheForWorkspace(await getWorkspaceFolder(), createCacheData(codigaConfig));
//
//     const rules = getRosieRules(Language.Python,
//       [
//         createMockRule("", "python", "python-ruleset", "python_rule_1"),
//         createMockRule("", "python", "python-ruleset", "python_rule_2"),
//         createMockRule("", "python", "python-ruleset", "python_rule_3")
//       ], pythonFile);
//
//     validateRuleCountAndRuleIds(rules,
//       2,
//       ["python-ruleset/python_rule_1", "python-ruleset/python_rule_3"]);
//   });
//
//   test("getRosieRules: should filter rules with ignore config with one matching file path prefix", async () => {
//     await createCodigaYml(
//       "rulesets:\n" +
//       "  - python-ruleset\n" +
//       "ignore:\n" +
//       "  - python-ruleset:\n" +
//       "    - python_rule_2:\n" +
//       "      - prefix: /python_file.py");
//     const codigaConfig = await parseCodigaConfig(codigaYaml);
//     const pythonFile = await testDataUriInWorkspace("python_file.py");
//
//     await refreshCacheForWorkspace(await getWorkspaceFolder(), createCacheData(codigaConfig));
//
//     const rules = getRosieRules(Language.Python,
//       [
//         createMockRule("", "python", "python-ruleset", "python_rule_1"),
//         createMockRule("", "python", "python-ruleset", "python_rule_2"),
//         createMockRule("", "python", "python-ruleset", "python_rule_3")
//       ], pythonFile);
//
//     validateRuleCountAndRuleIds(rules,
//       2,
//       ["python-ruleset/python_rule_1", "python-ruleset/python_rule_3"]);
//   });
//
//   test("getRosieRules: should filter rules with ignore config with one matching directory path prefix", async () => {
//     await createCodigaYml(
//       "rulesets:\n" +
//       "  - python-ruleset\n" +
//       "ignore:\n" +
//       "  - python-ruleset:\n" +
//       "    - python_rule_2:\n" +
//       "      - prefix: /directory");
//     const codigaConfig = await parseCodigaConfig(codigaYaml);
//     const pythonFile = await testDataUriInWorkspace("directory/python_file.py");
//
//     await refreshCacheForWorkspace(await getWorkspaceFolder(), createCacheData(codigaConfig));
//
//     const rules = getRosieRules(Language.Python,
//       [
//         createMockRule("", "python", "python-ruleset", "python_rule_1"),
//         createMockRule("", "python", "python-ruleset", "python_rule_2"),
//         createMockRule("", "python", "python-ruleset", "python_rule_3")
//       ], pythonFile);
//
//     validateRuleCountAndRuleIds(rules,
//       2,
//       ["python-ruleset/python_rule_1", "python-ruleset/python_rule_3"]);
//   });
//
//   test("getRosieRules: should not filter rules with ignore config with one prefix not matching", async () => {
//     await createCodigaYml(
//       "rulesets:\n" +
//       "  - python-ruleset\n" +
//       "ignore:\n" +
//       "  - python-ruleset:\n" +
//       "    - python_rule_2:\n" +
//       "      - prefix: not-matching");
//     const codigaConfig = await parseCodigaConfig(codigaYaml);
//     const pythonFile = await testDataUriInWorkspace("python_file.py");
//
//     await refreshCacheForWorkspace(await getWorkspaceFolder(), createCacheData(codigaConfig));
//
//     const rules = getRosieRules(Language.Python,
//       [
//         createMockRule("", "python", "python-ruleset", "python_rule_1"),
//         createMockRule("", "python", "python-ruleset", "python_rule_2"),
//         createMockRule("", "python", "python-ruleset", "python_rule_3")
//       ], pythonFile);
//
//     validateRuleCountAndRuleIds(rules,
//       3,
//       ["python-ruleset/python_rule_1", "python-ruleset/python_rule_2", "python-ruleset/python_rule_3"]);
//   });
//
//   test("getRosieRules: should not filter rules with ignore config with one prefix containing double dots", async () => {
//     await createCodigaYml(
//       "rulesets:\n" +
//       "  - python-ruleset\n" +
//       "ignore:\n" +
//       "  - python-ruleset:\n" +
//       "    - python_rule_2:\n" +
//       "      - prefix: python_file..py");
//     const codigaConfig = await parseCodigaConfig(codigaYaml);
//     const pythonFile = await testDataUriInWorkspace("python_file.py");
//
//     await refreshCacheForWorkspace(await getWorkspaceFolder(), createCacheData(codigaConfig));
//
//     const rules = getRosieRules(Language.Python,
//       [
//         createMockRule("", "python", "python-ruleset", "python_rule_1"),
//         createMockRule("", "python", "python-ruleset", "python_rule_2"),
//         createMockRule("", "python", "python-ruleset", "python_rule_3")
//       ], pythonFile);
//
//     validateRuleCountAndRuleIds(rules,
//       3,
//       ["python-ruleset/python_rule_1", "python-ruleset/python_rule_2", "python-ruleset/python_rule_3"]);
//   });
//
//   test("getRosieRules: should not filter rules with ignore config with one prefix containing single dot as folder", async () => {
//     await createCodigaYml(
//       "rulesets:\n" +
//       "  - python-ruleset\n" +
//       "ignore:\n" +
//       "  - python-ruleset:\n" +
//       "    - python_rule_2:\n" +
//       "      - prefix: directory/./python_file.py");
//     const codigaConfig = await parseCodigaConfig(codigaYaml);
//     const pythonFile = await testDataUriInWorkspace("directory/sub/python_file.py");
//
//     await refreshCacheForWorkspace(await getWorkspaceFolder(), createCacheData(codigaConfig));
//
//     const rules = getRosieRules(Language.Python,
//       [
//         createMockRule("", "python", "python-ruleset", "python_rule_1"),
//         createMockRule("", "python", "python-ruleset", "python_rule_2"),
//         createMockRule("", "python", "python-ruleset", "python_rule_3")
//       ], pythonFile);
//
//     validateRuleCountAndRuleIds(rules,
//       3,
//       ["python-ruleset/python_rule_1", "python-ruleset/python_rule_2", "python-ruleset/python_rule_3"]);
//   });
//
//   test("getRosieRules: should not filter rules with ignore config with one prefix containing double dots as folder", async () => {
//     await createCodigaYml(
//       "rulesets:\n" +
//       "  - python-ruleset\n" +
//       "ignore:\n" +
//       "  - python-ruleset:\n" +
//       "    - python_rule_2:\n" +
//       "      - prefix: directory/../python_file.py");
//     const codigaConfig = await parseCodigaConfig(codigaYaml);
//     const pythonFile = await testDataUriInWorkspace("directory/sub/python_file.py");
//
//     await refreshCacheForWorkspace(await getWorkspaceFolder(), createCacheData(codigaConfig));
//
//     const rules = getRosieRules(Language.Python,
//       [
//         createMockRule("", "python", "python-ruleset", "python_rule_1"),
//         createMockRule("", "python", "python-ruleset", "python_rule_2"),
//         createMockRule("", "python", "python-ruleset", "python_rule_3")
//       ], pythonFile);
//
//     validateRuleCountAndRuleIds(rules,
//       3,
//       ["python-ruleset/python_rule_1", "python-ruleset/python_rule_2", "python-ruleset/python_rule_3"]);
//   });
//
//   test("getRosieRules: should filter rules with ignore config with one matching prefix of multiple", async () => {
//     await createCodigaYml(
//       "rulesets:\n" +
//       "  - python-ruleset\n" +
//       "ignore:\n" +
//       "  - python-ruleset:\n" +
//       "    - python_rule_2:\n" +
//       "      - prefix:\n" +
//       "        - not/matching\n" +
//       "        - python_file.py");
//     const codigaConfig = await parseCodigaConfig(codigaYaml);
//     const pythonFile = await testDataUriInWorkspace("python_file.py");
//
//     await refreshCacheForWorkspace(await getWorkspaceFolder(), createCacheData(codigaConfig));
//
//     const rules = getRosieRules(Language.Python,
//       [
//         createMockRule("", "python", "python-ruleset", "python_rule_1"),
//         createMockRule("", "python", "python-ruleset", "python_rule_2"),
//         createMockRule("", "python", "python-ruleset", "python_rule_3")
//       ], pythonFile);
//
//     validateRuleCountAndRuleIds(rules,
//       2,
//       ["python-ruleset/python_rule_1", "python-ruleset/python_rule_3"]);
//   });
//
//   test("getRosieRules: should filter rules with ignore config with multiple matching prefixes", async () => {
//     await createCodigaYml(
//       "rulesets:\n" +
//       "  - python-ruleset\n" +
//       "ignore:\n" +
//       "  - python-ruleset:\n" +
//       "    - python_rule_2:\n" +
//       "      - prefix:\n" +
//       "        - /python\n" +
//       "        - python_file.py");
//     const codigaConfig = await parseCodigaConfig(codigaYaml);
//     const pythonFile = await testDataUriInWorkspace("python_file.py");
//
//     await refreshCacheForWorkspace(await getWorkspaceFolder(), createCacheData(codigaConfig));
//
//     const rules = getRosieRules(Language.Python,
//       [
//         createMockRule("", "python", "python-ruleset", "python_rule_1"),
//         createMockRule("", "python", "python-ruleset", "python_rule_2"),
//         createMockRule("", "python", "python-ruleset", "python_rule_3")
//       ], pythonFile);
//
//     validateRuleCountAndRuleIds(rules,
//       2,
//       ["python-ruleset/python_rule_1", "python-ruleset/python_rule_3"]);
//   });
//
//   test("getRosieRules: should not filter rules with ignore config with multiple prefixes not matching", async () => {
//     await createCodigaYml(
//       "rulesets:\n" +
//       "  - python-ruleset\n" +
//       "ignore:\n" +
//       "  - python-ruleset:\n" +
//       "    - python_rule_2:\n" +
//       "      - prefix:\n" +
//       "        - not-matching\n" +
//       "        - also/not/matching");
//     const codigaConfig = await parseCodigaConfig(codigaYaml);
//     const pythonFile = await testDataUriInWorkspace("python_file.py");
//
//     await refreshCacheForWorkspace(await getWorkspaceFolder(), createCacheData(codigaConfig));
//
//     const rules = getRosieRules(Language.Python,
//       [
//         createMockRule("", "python", "python-ruleset", "python_rule_1"),
//         createMockRule("", "python", "python-ruleset", "python_rule_2"),
//         createMockRule("", "python", "python-ruleset", "python_rule_3")
//       ], pythonFile);
//
//     validateRuleCountAndRuleIds(rules,
//       3,
//       ["python-ruleset/python_rule_1", "python-ruleset/python_rule_2", "python-ruleset/python_rule_3"]);
//   });
//
//   test("getRosieRules: should filter rules with ignore config with multiple rule ignore configurations", async () => {
//     await createCodigaYml(
//       "rulesets:\n" +
//       "  - python-ruleset\n" +
//       "ignore:\n" +
//       "  - python-ruleset:\n" +
//       "    - python_rule_2:\n" +
//       "      - prefix: python_file..py\n" +
//       "    - python_rule_3:\n" +
//       "      - prefix:\n" +
//       "        - /python_fi");
//     const codigaConfig = await parseCodigaConfig(codigaYaml);
//     const pythonFile = await testDataUriInWorkspace("python_file.py");
//
//     await refreshCacheForWorkspace(await getWorkspaceFolder(), createCacheData(codigaConfig));
//
//     const rules = getRosieRules(Language.Python,
//       [
//         createMockRule("", "python", "python-ruleset", "python_rule_1"),
//         createMockRule("", "python", "python-ruleset", "python_rule_2"),
//         createMockRule("", "python", "python-ruleset", "python_rule_3")
//       ], pythonFile);
//
//     validateRuleCountAndRuleIds(rules,
//       2,
//       ["python-ruleset/python_rule_1", "python-ruleset/python_rule_2"]);
//   });
//
//   test("getRosieRules: should not filter rules when rule doesnt belong to ruleset", async () => {
//     await createCodigaYml(
//       "rulesets:\n" +
//       "  - python-ruleset\n" +
//       "ignore:\n" +
//       "  - python-ruleset:\n" +
//       "    - non_python_rule:\n" +
//       "      - prefix: python_file..py");
//     const codigaConfig = await parseCodigaConfig(codigaYaml);
//     const pythonFile = await testDataUriInWorkspace("python_file.py");
//
//     await refreshCacheForWorkspace(await getWorkspaceFolder(), createCacheData(codigaConfig));
//
//     const rules = getRosieRules(Language.Python,
//       [
//         createMockRule("", "python", "python-ruleset", "python_rule_1"),
//         createMockRule("", "python", "python-ruleset", "python_rule_2"),
//         createMockRule("", "python", "python-ruleset", "python_rule_3")
//       ], pythonFile);
//
//     validateRuleCountAndRuleIds(rules,
//       3,
//       ["python-ruleset/python_rule_1", "python-ruleset/python_rule_2", "python-ruleset/python_rule_3"]);
//   });
//
//   test("getRosieRules: should not filter rules when ruleset ignore is not present in rulesets property", async () => {
//     await createCodigaYml(
//       "rulesets:\n" +
//       "  - python-ruleset\n" +
//       "ignore:\n" +
//       "  - not-configured-ruleset:\n" +
//       "    - python_rule_2:\n" +
//       "      - prefix: python_file.py");
//     const codigaConfig = await parseCodigaConfig(codigaYaml);
//     const pythonFile = await testDataUriInWorkspace("python_file.py");
//
//     await refreshCacheForWorkspace(await getWorkspaceFolder(), createCacheData(codigaConfig));
//
//     const rules = getRosieRules(Language.Python,
//       [
//         createMockRule("", "python", "python-ruleset", "python_rule_1"),
//         createMockRule("", "python", "python-ruleset", "python_rule_2"),
//         createMockRule("", "python", "python-ruleset", "python_rule_3")
//       ], pythonFile);
//
//     validateRuleCountAndRuleIds(rules,
//       3,
//       ["python-ruleset/python_rule_1", "python-ruleset/python_rule_2", "python-ruleset/python_rule_3"]);
//   });
//
//   //getRulesFromCache
//
//   test("getRulesFromCache: returns empty array when there is no workspace for the document", async () => {
//     //text_file.txt is not present in the workspace
//     const fileUri = await testDataUri("text_file.txt");
//     const file = await vscode.workspace.openTextDocument(fileUri);
//
//     const rules = await getRulesFromCache(file);
//     assert.strictEqual(rules.length, 0);
//   });
//
//   test("getRulesFromCache: returns empty array when rules cache doesn't have the workspace stored", async () => {
//     const fileUri = await testDataUriInWorkspace("python_file.py");
//     const file = await vscode.workspace.openTextDocument(fileUri);
//
//     const rules = await getRulesFromCache(file);
//     assert.strictEqual(rules.length, 0);
//   });
//
//   test("getRulesFromCache: returns empty array when rules cache doesn't have rule for a workspace", async () => {
//     const workspaceFolder = await getWorkspaceFolder();
//     const cacheData: CacheData = {
//       codigaYmlConfig: CodigaYmlConfig.EMPTY,
//       lastRefreshed: 0,
//       lastTimestamp: 1,
//       fileLastModification: 0,
//       rules: [createMockRule("", "typescript")]
//     };
//     await refreshCacheForWorkspace(workspaceFolder, cacheData);
//
//     const fileUri = await testDataUriInWorkspace("python_file.py");
//     const file = await vscode.workspace.openTextDocument(fileUri);
//
//     const rules = await getRulesFromCache(file);
//     assert.strictEqual(rules.length, 0);
//   });
//
//   test("getRulesFromCache: returns empty array for document with unsupported language", async () => {
//     const workspaceFolder = await getWorkspaceFolder();
//     const cacheData: CacheData = {
//       codigaYmlConfig: CodigaYmlConfig.EMPTY,
//       lastRefreshed: 0,
//       lastTimestamp: 1,
//       fileLastModification: 0,
//       rules: [createMockRule("", "python")]
//     };
//     await refreshCacheForWorkspace(workspaceFolder, cacheData);
//
//     const fileUri = await testDataUriInWorkspace("unsupported.configuration");
//     const file = await vscode.workspace.openTextDocument(fileUri);
//
//     const rules = await getRulesFromCache(file);
//     assert.strictEqual(rules.length, 0);
//   });
//
//   test("getRulesFromCache: returns rules for document", async () => {
//     const workspaceFolder = await getWorkspaceFolder();
//     const cacheData: CacheData = {
//       codigaYmlConfig: CodigaYmlConfig.EMPTY,
//       lastRefreshed: 0,
//       lastTimestamp: 1,
//       fileLastModification: 0,
//       rules: [
//         createMockRule("", "python"),
//         createMockRule("", "javascript"),
//         createMockRule("", "python")
//       ]
//     };
//     await refreshCacheForWorkspace(workspaceFolder, cacheData);
//
//     const fileUri = await testDataUriInWorkspace("python_file.py");
//     const file = await vscode.workspace.openTextDocument(fileUri);
//
//     const rules = await getRulesFromCache(file);
//     assert.strictEqual(rules.length, 2);
//     assert.strictEqual(rules[0].language, "python");
//     assert.strictEqual(rules[1].language, "python");
//   });
// });
