import * as assert from "assert";
import * as vscode from "vscode";
import {createMockRule, getWorkspaceFolder} from "../../testUtils";
import {CacheData, updateCacheForWorkspace} from "../../../rosie/rosieCache";
import * as fs from "fs";
import {fail} from "assert";

suite("Rosie cache update", () => {

  let codigaYaml: vscode.Uri;

  async function createCodigaYml(content: string) {
    codigaYaml = vscode.Uri.joinPath((await getWorkspaceFolder()).uri, "codiga.yml");
    const codigaFileContent = Buffer.from(content, "utf-8");
    await vscode.workspace.fs.writeFile(codigaYaml, codigaFileContent);
  }

  // Hooks

  teardown(async () => {
    //Resets the content of codiga.yml to the original one,
    //so that no manual revert has to be done when tests run locally.
    await createCodigaYml("");
  });

  // updateCacheForWorkspace

  test("updateCacheForWorkspace: deletes workspace from cache when there is no ruleset in codiga.yml", async () => {
    await createCodigaYml("rulesets:");

    const cache = new Map<vscode.WorkspaceFolder, CacheData>();
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
    cache.set(workspaceFolder, cacheData);

    await updateCacheForWorkspace(cache, workspaceFolder, codigaYaml);

    assert.strictEqual(cache.size, 0);
  });

  test("updateCacheForWorkspace: deletes workspace from cache when there is no last updated timestamp returned", async () => {
    await createCodigaYml("rulesets:\n  - undefined-ruleset");
    const cache = new Map<vscode.WorkspaceFolder, CacheData>();
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
    cache.set(workspaceFolder, cacheData);

    await updateCacheForWorkspace(cache, workspaceFolder, codigaYaml);

    assert.strictEqual(cache.size, 0);
  });

  test("updateCacheForWorkspace: cache update with no lastRefreshed update, when there is no existing cache data for workspace", async () => {
    await createCodigaYml("rulesets:\n  - actual-ruleset");
    const cache = new Map<vscode.WorkspaceFolder, CacheData>();

    const currentWorkspaceFolder = await getWorkspaceFolder();
    //Instead of opening a second workspace, we initialize the cache with a fake workspace,
    //so we can achieve that one workspace is not in the cache yet.
    const mockWorkspaceFolder: vscode.WorkspaceFolder = {
      index: 10, name: "mock-workspace", uri: vscode.Uri.parse("untitled:mock-workspace")
    };
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
    cache.set(currentWorkspaceFolder, cacheData);

    //Update cache

    await updateCacheForWorkspace(cache, mockWorkspaceFolder, codigaYaml);

    //Assertions

    assert.strictEqual(cache.size, 2);
    assert.deepStrictEqual(cache.get(currentWorkspaceFolder), cacheData);

    const mockWorkspaceData = cache.get(mockWorkspaceFolder);
    assert.notStrictEqual(mockWorkspaceData, undefined);
    // @ts-ignore
    assert.strictEqual(mockWorkspaceData.rules[0].language, "typescript");
    // @ts-ignore
    assert.strictEqual(mockWorkspaceData.rules[1].language, "typescript");

    assert.strictEqual(cacheData.lastRefreshed, 0);
  });

  test("updateCacheForWorkspace: cache update with no lastRefreshed update, when existing cache data's last update is different than on server", async () => {
    await createCodigaYml("rulesets:\n  - actual-ruleset");
    const cache = new Map<vscode.WorkspaceFolder, CacheData>();
    const workspaceFolder = await getWorkspaceFolder();
    const cacheData: CacheData = {
      lastRefreshed: 0,
      lastTimestamp: 50, //see rules.ts#getRulesLastUpdatedTimestamp
      fileLastModification: 0,
      rules: [
        createMockRule("", "python"),
        createMockRule("", "javascript"),
        createMockRule("", "python")
      ]
    };
    cache.set(workspaceFolder, cacheData);

    //Update cache

    await updateCacheForWorkspace(cache, workspaceFolder, codigaYaml);

    //Assertions

    assert.strictEqual(cache.size, 1);
    const data = cache.get(workspaceFolder);
    if (!data) {
      fail("No cache data for current workspace.");
    }
    assert.strictEqual(data.rules.length, 2);
    assert.strictEqual(data.rules[0].language, "typescript");
    assert.strictEqual(data.rules[1].language, "typescript");

    assert.strictEqual(cacheData.lastRefreshed, 0);
  });

  test("updateCacheForWorkspace: ache update with no lastRefreshed update, when existing cache data's last modification has changed", async () => {
    await createCodigaYml("rulesets:\n  - actual-ruleset");
    const cache = new Map<vscode.WorkspaceFolder, CacheData>();
    const workspaceFolder = await getWorkspaceFolder();
    const cacheData: CacheData = {
      lastRefreshed: 0,
      lastTimestamp: 100, //see rules.ts#getRulesLastUpdatedTimestamp
      fileLastModification: 0, //the last modification will be the file's actual timestamp in updateCacheForWorkspace
      rules: [
        createMockRule("", "python"),
        createMockRule("", "javascript"),
        createMockRule("", "python")
      ]
    };
    cache.set(workspaceFolder, cacheData);

    //Update cache

    await updateCacheForWorkspace(cache, workspaceFolder, codigaYaml);

    //Assertions

    assert.strictEqual(cache.size, 1);
    const data = cache.get(workspaceFolder);
    if (!data) {
      fail("No cache data for current workspace.");
    }
    assert.strictEqual(data.rules.length, 2);
    assert.strictEqual(data.rules[0].language, "typescript");
    assert.strictEqual(data.rules[1].language, "typescript");

    assert.strictEqual(cacheData.lastRefreshed, 0);
  });

  test("updateCacheForWorkspace: updates last refreshed timestamp on existing cache data", async () => {
    await createCodigaYml("rulesets:\n  - actual-ruleset");
    const cache = new Map<vscode.WorkspaceFolder, CacheData>();
    const workspaceFolder = await getWorkspaceFolder();
    const stats = fs.statSync(codigaYaml.fsPath);

    const cacheData: CacheData = {
      lastRefreshed: 0,
      lastTimestamp: 100, //see rules.ts#getRulesLastUpdatedTimestamp
      fileLastModification: stats.mtimeMs, //codiga.yml's actual last modification timestamp
      rules: [
        createMockRule("", "python"),
        createMockRule("", "javascript"),
        createMockRule("", "python")
      ]
    };
    cache.set(workspaceFolder, cacheData);

    //Update cache

    await updateCacheForWorkspace(cache, workspaceFolder, codigaYaml);

    //Assertions

    assert.strictEqual(cache.size, 1);
    const data = cache.get(workspaceFolder);
    if (!data) {
      fail("No cache data for current workspace.");
    }
    assert.strictEqual(data.rules.length, 3);
    assert.notStrictEqual(cacheData.lastRefreshed, 0);
  });
});
