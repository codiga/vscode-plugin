import * as fs from "fs";
import { parse } from "yaml";
import * as vscode from "vscode";
import {
  CODIGA_RULES_FILE, CODIGA_RULESET_NAME_PATTERN,
  RULES_MAX_TIME_IN_CACHE_MS,
  RULES_POLLING_INTERVAL_MS,
} from "../constants";
import { getRules, getRulesLastUpdatedTimestamp } from "../graphql-api/rules";
import { wasActiveRecently } from "../utils/activity";
import { getLanguageForDocument } from "../utils/fileUtils";
import { Rule } from "./rosieTypes";
import { rollbarLogger } from "../utils/rollbarUtils";
import { Language } from "../graphql-api/types";
import {isInTestMode} from "../extension";

/**
 * All timestamps are in milliseconds.
 */
export interface CacheData {
  lastRefreshed: number; // last time we refreshed the data
  lastTimestamp: number; // timestamp of all rules used
  fileLastModification: number; // last modification timestamp of the codiga file
  rules: Rule[];
}

const RULES_CACHE = new Map<vscode.WorkspaceFolder, CacheData>();

/**
 * Periodically refresh the cache for all rules that have been used.
 */
export const refreshCachePeriodic = async (): Promise<void> => {
  if (isInTestMode === true) {
    return;
  }

  await refreshCache(RULES_CACHE).catch((e) => {
    rollbarLogger(e);
    console.error("error while fetching rules");
  });
  garbageCollection(RULES_CACHE);
  setTimeout(refreshCachePeriodic, RULES_POLLING_INTERVAL_MS);
};

/**
 * Remove the rules that have not been used for a while.
 *
 * @param cache the rules cache
 */
export const garbageCollection = (
  cache: Map<vscode.WorkspaceFolder, CacheData>
): void => {
  const nowMs = Date.now();
  const workspacesToDelete = [];

  //First, look at the keys we need to collect/remove from the cache.
  for (const workspace of cache.keys()) {
    const cacheValue = cache.get(workspace);
    if (cache.has(workspace) && cacheValue) {
      //If the data has been in the cache for long enough, mark it for garbage collection.
      if (cacheValue.lastRefreshed < nowMs - RULES_MAX_TIME_IN_CACHE_MS) {
        workspacesToDelete.push(workspace);
      }
    }
  }

  //Remove data for all marked workspaces from the cache.
  workspacesToDelete.forEach((workspace) => {
    cache.delete(workspace);
  });
};

/**
 * Resets the cache with the provided data. Only to be used in tests.
 */
export const refreshCacheForWorkspace = async (
  workspace: vscode.WorkspaceFolder, cacheData: CacheData
): Promise<void> => {
    RULES_CACHE.clear();
    RULES_CACHE.set(workspace, cacheData);
};

/**
 * Actually refresh the cache for all workspaces.
 *
 * No cache update is performed if the editor has not been active for a while.
 *
 * @param cache the rules cache.
 */
export const refreshCache = async (
  cache: Map<vscode.WorkspaceFolder, CacheData>
): Promise<void> => {
  if (!wasActiveRecently()) {
    return;
  }

  const folders = vscode.workspace.workspaceFolders;
  folders?.forEach((workspaceFolder) => {
    const codigaFile = vscode.Uri.joinPath(workspaceFolder.uri, CODIGA_RULES_FILE);
    // If there is a Codiga file, let's fetch the rules
    if (fs.existsSync(codigaFile.fsPath)) {
      updateCacheForWorkspace(cache, workspaceFolder, codigaFile);
    }
  });
};

/**
 * Get the ruleset names from the codiga.yml file.
 *
 * Returns an empty set of ruleset names if the codiga.yml doesn't exist,
 * the content of the file is malformed, or there was an error during reading the contents of the file.
 *
 * Exported for testing purposes.
 */
export const getRulesetsFromYamlFile = async (
  codigaFile: vscode.Uri
): Promise<string[]> => {
  // If the codiga.yml doesn't exist, no ruleset name is returned
  if (!fs.existsSync(codigaFile.fsPath)) {
    return [];
  }

  // Read the YAML file content and get the rulesets
  try {
    const fileContent = fs.readFileSync(codigaFile.fsPath, {encoding: "utf-8"});
    const yamlContent = parse(fileContent) as any;
    if (yamlContent && yamlContent["rulesets"]) {
      const rulesets = yamlContent["rulesets"] as string[];
      //Returns only the valid ruleset names
      return rulesets.filter(ruleset => CODIGA_RULESET_NAME_PATTERN.test(ruleset));
    }
    return [];
  } catch (e) {
    console.log("error when reading the rulesets");
    console.log(e);
    rollbarLogger(e);
    return [];
  }
};

/**
 * Refresh/update the cache for the workspace.
 * Update if and only if the update timestamp for all rules
 * is different than the previous one.
 *
 * This is exported for testing, so that we can keep the async nature of
 * this function when called in 'refreshCache', but can await it in tests, and test
 * it separately.
 *
 * @param cache the rules cache
 * @param workspace the current workspace
 * @param codigaFile the URI of the codiga.yml file
 */
export const updateCacheForWorkspace = async (
  cache: Map<vscode.WorkspaceFolder, CacheData>,
  workspace: vscode.WorkspaceFolder,
  codigaFile: vscode.Uri
): Promise<void> => {
  const rulesets = await getRulesetsFromYamlFile(codigaFile);

  // no rulesets to query, just exit
  if (!rulesets || rulesets.length === 0) {
    // if there was some data before, delete it
    if (cache.has(workspace)) {
      cache.delete(workspace);
    }
    return;
  }

  const nowMs = Date.now();
  const stats = fs.statSync(codigaFile.fsPath);
  const lastUpdateOnFileTimestampMs = stats.mtimeMs;

  try {
    // get the last update timestamp for all the rulesets
    const rulesTimestamp = await getRulesLastUpdatedTimestamp(rulesets);

    if (!rulesTimestamp) {
      // if there was some data before, delete it
      if (cache.has(workspace)) {
        cache.delete(workspace);
      }
      return;
    }

    /**
     * If the existing cache timestamp is the same as the timestamp
     * being retrieved, just exit, but update the last refreshed data.
     */
    const existingCacheData = cache.get(workspace);
    if (
      existingCacheData &&
      existingCacheData.lastTimestamp === rulesTimestamp &&
      existingCacheData.fileLastModification === lastUpdateOnFileTimestampMs
    ) {
      existingCacheData.lastRefreshed = nowMs;
      cache.set(workspace, existingCacheData);
      return;
    }

    /**
     * The timestamp is different OR there is no data in the cache yet,
     * so let's refresh all the rulesets.
     */
    const rules = await getRules(rulesets);

    const newCacheData: CacheData = {
      rules: rules,
      lastRefreshed: nowMs,
      lastTimestamp: rulesTimestamp,
      fileLastModification: lastUpdateOnFileTimestampMs,
    };

    cache.set(workspace, newCacheData);
  } catch (e) {
    console.log("error when reading or updating the rules");
    console.log(e);
    rollbarLogger(e);
  }
};

/**
 * Filters all the rules given to the ones we want to run for a single file.
 *
 * @param languages all the languages that we want rules from
 * @param rules all the cached rules on the workspace
 * @returns an array containing all the rules to analyze a file
 */
export const filterRules = (languages: Language[], rules: Rule[]) => {
  const rosieLanguages = languages.map((l) => l.toLowerCase());
  return rules.filter((rule) =>
    rosieLanguages.includes(rule.language.toLocaleLowerCase())
  );
};

/**
 * Gets all the rules for a file to run against.
 *
 * @param language the language of the file
 * @param rules an array of all cached rules
 * @returns an array containing only the rules needed for a file to analyze
 */
export const getRosieRulesForLanguage = (
  language: Language,
  rules: Rule[] | undefined
) => {
  if (!rules) return [];

  switch (language) {
    case Language.Python:
      return filterRules([Language.Python], rules);
    case Language.Javascript:
      return filterRules([Language.Javascript], rules);
    case Language.Typescript:
      return filterRules([Language.Javascript, Language.Typescript], rules);
    default:
      return [];
  }
};

/**
 * Get the list of rules for a particular document from the cache.
 *
 * @param doc the document to get the rules for
 * @returns the array of rules for the language of the given document
 */
export const getRulesFromCache = async (
  doc: vscode.TextDocument
): Promise<Rule[]> => {
  const workspaceFolder = vscode.workspace.getWorkspaceFolder(doc.uri);

  if (workspaceFolder && RULES_CACHE.has(workspaceFolder)) {
    const rules = RULES_CACHE.get(workspaceFolder)?.rules;
    return rules
      ? getRosieRulesForLanguage(getLanguageForDocument(doc), rules)
      : [];
  }
  return [];
};
