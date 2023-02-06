global.isInTestMode = true;

import * as assert from "assert";
import {createCacheData, createCodigaYml, createMockRule, initWorkspaceFolder} from "./testUtils";
import {CacheData, CodigaYmlConfig, updateCacheForWorkspace} from "../rosie/rosieCache";
import * as fs from "fs";
import {fail} from "assert";
import {URI as vsUri} from 'vscode-uri';
import {URI} from "vscode-languageserver-types";
import {WorkspaceFolder} from "vscode-languageserver";
import * as path from "path";
import * as os from "os";

suite("Rosie cache update", () => {
  let workspaceFolder: vsUri;
  let codigaYaml: vsUri;

  // Helpers

  async function initializeRulesCache(codigaYmlContent: string, cacheData: CacheData): Promise<Map<URI, CacheData>> {
    codigaYaml = await createCodigaYml(workspaceFolder, codigaYmlContent);
    const cache = new Map<URI, CacheData>();
    cache.set(workspaceFolder.path, cacheData);
    return cache;
  }

  // Hooks

  setup(async () => {
    //Uses an arbitrary URI based on the OS-specific temp directory.
    workspaceFolder = process.platform === 'darwin'
      ? vsUri.parse(`file://${path.join(os.tmpdir(), "workspaceFolder")}`)
      : vsUri.parse(`file:///${path.join(os.tmpdir(), "workspaceFolder")}`);
    initWorkspaceFolder(workspaceFolder);
  });

  teardown(async () => {
    if (codigaYaml && fs.existsSync(codigaYaml.fsPath)) {
      fs.rmSync(codigaYaml.fsPath);
      fs.rmdirSync(workspaceFolder.fsPath);
    }
  });

  // updateCacheForWorkspace

  test("updateCacheForWorkspace: deletes workspace from cache when there is no ruleset in codiga.yml", async () => {
    const cache = await initializeRulesCache(
      "rulesets:",
      createCacheData(
        CodigaYmlConfig.EMPTY,
        [
          createMockRule("python"),
          createMockRule("javascript"),
          createMockRule("python")
        ]));

    await updateCacheForWorkspace(cache, workspaceFolder.path, codigaYaml);

    assert.strictEqual(cache.size, 0);
  });

  test("updateCacheForWorkspace: deletes workspace from cache when there is no last updated timestamp returned", async () => {
    const cache = await initializeRulesCache(
      "rulesets:\n  - undefined-ruleset",
      createCacheData(
        new CodigaYmlConfig(["undefined-ruleset"]),
        [
          createMockRule("python"),
          createMockRule("javascript"),
          createMockRule("python")
        ]));

    await updateCacheForWorkspace(cache, workspaceFolder.path, codigaYaml);

    assert.strictEqual(cache.size, 0);
  });

  test("updateCacheForWorkspace: cache update with no lastRefreshed update, when there is no existing cache data for workspace", async () => {
    const cacheData = createCacheData(
      new CodigaYmlConfig(["actual-ruleset"]),
      [
        createMockRule("python"),
        createMockRule("javascript"),
        createMockRule("python")
      ]);
    const cache = await initializeRulesCache("rulesets:\n  - actual-ruleset", cacheData);

    //Instead of opening a second workspace, we initialize the cache with a fake workspace,
    //so we can achieve that one workspace is not in the cache yet.
    const mockWorkspaceFolder: WorkspaceFolder = {
      name: "mock-workspace", uri: vsUri.parse("file:///C:/mock-workspace").path
    };

    //Update cache

    await updateCacheForWorkspace(cache, mockWorkspaceFolder.uri, codigaYaml);

    //Assertions

    assert.strictEqual(cache.size, 2);
    assert.deepStrictEqual(cache.get(workspaceFolder.path), cacheData);

    const mockWorkspaceData = cache.get(mockWorkspaceFolder.uri);
    assert.notStrictEqual(mockWorkspaceData, undefined);
    // @ts-ignore
    assert.strictEqual(mockWorkspaceData.rules[0].language, "typescript");
    // @ts-ignore
    assert.strictEqual(mockWorkspaceData.rules[1].language, "typescript");

    assert.strictEqual(cacheData.lastRefreshed, 0);
  });

  test("updateCacheForWorkspace: cache update with no lastRefreshed update, when existing cache data's last update is different than on server", async () => {
    const cacheData = {
      codigaYmlConfig: new CodigaYmlConfig(["actual-ruleset"]),
      lastRefreshed: 0,
      lastTimestamp: 50, //see rules.ts#getRulesLastUpdatedTimestamp
      fileLastModification: 0,
      rules: [
        createMockRule("python"),
        createMockRule("javascript"),
        createMockRule("python")
      ]
    };
    const cache = await initializeRulesCache("rulesets:\n  - actual-ruleset", cacheData);

    //Update cache

    await updateCacheForWorkspace(cache, workspaceFolder.path, codigaYaml);

    //Assertions

    assert.strictEqual(cache.size, 1);
    const data = cache.get(workspaceFolder.path);
    if (!data) {
      fail("No cache data for current workspace.");
    }
    assert.strictEqual(data.rules.length, 2);
    assert.strictEqual(data.rules[0].language, "typescript");
    assert.strictEqual(data.rules[1].language, "typescript");

    assert.strictEqual(cacheData.lastRefreshed, 0);
  });

  test("updateCacheForWorkspace: ache update with no lastRefreshed update, when existing cache data's last modification has changed", async () => {
    const cacheData = {
      codigaYmlConfig: new CodigaYmlConfig(["actual-ruleset"]),
      lastRefreshed: 0,
      lastTimestamp: 100, //see rules.ts#getRulesLastUpdatedTimestamp
      fileLastModification: 0, //the last modification will be the file's actual timestamp in updateCacheForWorkspace
      rules: [
        createMockRule("python"),
        createMockRule("javascript"),
        createMockRule("python")
      ]
    };
    const cache = await initializeRulesCache("rulesets:\n  - actual-ruleset", cacheData);

    //Update cache

    await updateCacheForWorkspace(cache, workspaceFolder.path, codigaYaml);

    //Assertions

    assert.strictEqual(cache.size, 1);
    const data = cache.get(workspaceFolder.path);
    if (!data) {
      fail("No cache data for current workspace.");
    }
    assert.strictEqual(data.rules.length, 2);
    assert.strictEqual(data.rules[0].language, "typescript");
    assert.strictEqual(data.rules[1].language, "typescript");

    assert.strictEqual(cacheData.lastRefreshed, 0);
  });

  test("updateCacheForWorkspace: updates last refreshed timestamp on existing cache data", async () => {
    codigaYaml = await createCodigaYml(workspaceFolder, "rulesets:\n  - actual-ruleset");
    const cache = new Map<URI, CacheData>();
    const stats = fs.statSync(codigaYaml.fsPath);

    const cacheData: CacheData = {
      codigaYmlConfig: new CodigaYmlConfig(["actual-ruleset"]),
      lastRefreshed: 0,
      lastTimestamp: 100, //see rules.ts#getRulesLastUpdatedTimestamp
      fileLastModification: stats.mtimeMs, //codiga.yml's actual last modification timestamp
      rules: [
        createMockRule("python"),
        createMockRule("javascript"),
        createMockRule("python")
      ]
    };
    cache.set(workspaceFolder.path, cacheData);

    //Update cache

    await updateCacheForWorkspace(cache, workspaceFolder.path, codigaYaml);

    //Assertions

    assert.strictEqual(cache.size, 1);
    const data = cache.get(workspaceFolder.path);
    if (!data) {
      fail("No cache data for current workspace.");
    }
    assert.strictEqual(data.rules.length, 3);
    assert.notStrictEqual(cacheData.lastRefreshed, 0);
  });
});
