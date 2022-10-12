import * as fs from "fs";
import * as yaml from "js-yaml";
import * as vscode from "vscode";
import {
  CODIGA_RULES_FILE,
  RULES_MAX_TIME_IN_CACHE_MS,
  RULES_POLLING_INTERVAL_MS,
} from "../constants";
import { getRules, getRulesLastUpdatedTimestamp } from "../graphql-api/rules";
import { wasActiveRecently } from "../utils/activity";
import { getLanguageForDocument } from "../utils/fileUtils";
import { GRAPHQL_LANGUAGE_TO_ROSIE_LANGUAGE } from "./rosieConstants";
import { Rule } from "./rosieTypes";

interface CacheData {
  lastRefreshed: number; // last time we refreshed the data
  lastTimestamp: number; // timestamp of all rules used
  rules: Rule[];
}

const RULES_CACHE = new Map<vscode.WorkspaceFolder, CacheData>();

/**
 * Periodically refresh the cache for all rules that have been used
 */
export const refreshCachePeriodic = async (): Promise<void> => {
  await refreshCache(RULES_CACHE).catch((e) => {
    console.error("error while fetching shortcuts");
  });
  garbageCollection(RULES_CACHE);
  setTimeout(refreshCachePeriodic, RULES_POLLING_INTERVAL_MS);
};

/**
 * Remove the rules that have not been used for a while
 * @param cache
 */
export const garbageCollection = (
  cache: Map<vscode.WorkspaceFolder, CacheData>
): void => {
  const nowMs = Date.now();
  const keysToCollect = [];

  /**
   * First, look at the keys we need to collect/remove
   * from the cache.
   */
  for (const key of cache.keys()) {
    const cacheValue = cache.get(key);
    if (cache.has(key) && cacheValue) {
      /**
       * Was the data in the cache long enough?
       */
      if (cacheValue.lastRefreshed < nowMs - RULES_MAX_TIME_IN_CACHE_MS) {
        keysToCollect.push(key);
      }
    }
  }

  /**
   * Remove the data from the cache.
   */
  keysToCollect.forEach((key) => {
    cache.delete(key);
  });
};

/**
 * Actually refresh the cache for all workspaces
 * @param cache
 */
export const refreshCache = async (
  cache: Map<vscode.WorkspaceFolder, CacheData>
): Promise<void> => {
  if (!wasActiveRecently()) {
    return;
  }

  const folders = vscode.workspace.workspaceFolders;
  folders?.forEach((workspaceFolder) => {
    const codigaFile = vscode.Uri.joinPath(
      workspaceFolder.uri,
      CODIGA_RULES_FILE
    );

    // If there is a Codiga file, let's fetch the rules
    if (fs.existsSync(codigaFile.fsPath)) {
      updateCacheForWorkspace(cache, workspaceFolder, codigaFile);
    }
  });
};

/**
 * Refresh/update the cache for the workspace.
 * Update if and only if the update timestamp for all rules
 * is different than the previous one.
 * @param cache
 * @param workspace
 * @param codigaFile
 * @returns
 */
const updateCacheForWorkspace = async (
  cache: Map<vscode.WorkspaceFolder, CacheData>,
  workspace: vscode.WorkspaceFolder,
  codigaFile: vscode.Uri
): Promise<void> => {
  if (!fs.existsSync(codigaFile.path)) {
    return;
  }
  const nowMs = Date.now();

  const fileContent = await (
    await vscode.workspace.fs.readFile(codigaFile)
  ).toString();
  try {
    const yamlContent = yaml.load(fileContent) as any;

    // get all the rulesets from the YAML file
    const rulesets = yamlContent.flatMap((c: any) => {
      if (c["rulesets"]) {
        return c["rulesets"];
      } else {
        return [];
      }
    });

    // no rulesets to query, just exit
    if (!rulesets || rulesets.length == 0) {
      return;
    }

    // get the last update timestamp for all the rulesets
    const rulesTimestamp = await getRulesLastUpdatedTimestamp(rulesets);

    if (!rulesTimestamp) {
      // if there was some data before, delete it
      if (cache.has(workspace)) {
        cache.delete(workspace);
      }
      console.log("no timestamp, not putting anything in the cache");
      return;
    }

    /**
     * If the existing cache timestamp is the same than the timestamp
     * being retrieved, just exit but update the last refreshed data.
     */
    const existingCacheData = cache.get(workspace);
    if (
      existingCacheData &&
      existingCacheData.lastTimestamp === rulesTimestamp
    ) {
      existingCacheData.lastRefreshed = nowMs;
      cache.set(workspace, existingCacheData);
      return;
    }

    /**
     * The timestamp is different OR there is no data in the cache yet
     * so let's refresh all the rulesets.
     */
    const rules = await getRules(rulesets);

    const newCacheData: CacheData = {
      rules: rules,
      lastRefreshed: nowMs,
      lastTimestamp: rulesTimestamp,
    };

    cache.set(workspace, newCacheData);
  } catch (e) {
    console.log("error when reading the updating the rules");
    console.log(e);
  }
};

/**
 * Get the list of rules for a particular document from the cache.
 * @param doc
 * @returns
 */
export const getRulesFromCache = async (
  doc: vscode.TextDocument
): Promise<Rule[]> => {
  console.log("doc");
  console.log(doc);
  const workspacefolder = vscode.workspace.getWorkspaceFolder(doc.uri);
  console.log("workspace folder");

  console.log(workspacefolder);
  console.log(workspacefolder?.uri.path);
  if (!workspacefolder) {
    return [];
  }

  if (RULES_CACHE.has(workspacefolder)) {
    const rules = RULES_CACHE.get(workspacefolder)?.rules;
    if (rules) {
      const language = getLanguageForDocument(doc);
      const rosieLanguage = GRAPHQL_LANGUAGE_TO_ROSIE_LANGUAGE.get(language);
      if (rosieLanguage) {
        console.log("got something in cache");
        return rules.filter((r) => r.language === rosieLanguage);
      } else {
        console.log("got something in cache");
        return [];
      }
    } else {
      return [];
    }
  } else {
    console.log("nothing in cache");
    return [];
  }
};
