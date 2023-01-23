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
  codigaYmlConfig: CodigaYmlConfig;
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
export const parseCodigaConfig = async (
  codigaFile: vscode.Uri
): Promise<CodigaYmlConfig> => {
  // If the codiga.yml doesn't exist, no ruleset name is returned
  if (!fs.existsSync(codigaFile.fsPath)) {
    return CodigaYmlConfig.EMPTY;
  }

  // Read the YAML file content and get the rulesets, ignore and other configuration.
  try {
    const fileContent = fs.readFileSync(codigaFile.fsPath, {encoding: "utf-8"});
    const yamlContent = parse(fileContent) as any;
    if (yamlContent) {
      const codigaYmlConfig = new CodigaYmlConfig();
      setRulesets(codigaYmlConfig, yamlContent);
      setIgnore(codigaYmlConfig, yamlContent);
      return codigaYmlConfig;
    }
    return CodigaYmlConfig.EMPTY;
  } catch (e) {
    console.log("Error when parsing the codiga.yml file.");
    console.log(e);
    rollbarLogger(e);
    return CodigaYmlConfig.EMPTY;
  }
};

/**
 * Configures the rulesets in the argument {@link CodigaYmlConfig} based on the deserialized config data.
 *
 * @param codigaYmlConfig The Codiga config in which rulesets are being configured
 * @param yamlContent The content of the codiga.yml file
 */
const setRulesets = (
  codigaYmlConfig: CodigaYmlConfig,
  yamlContent: any
): void => {
  if (yamlContent["rulesets"]) {
    const rulesets = yamlContent["rulesets"] as string[];
    //Returns only the valid ruleset names
    codigaYmlConfig.rulesetNames = rulesets.filter(ruleset => CODIGA_RULESET_NAME_PATTERN.test(ruleset));
  }
};

/**
 * Configures the ignores in the argument {@link CodigaYmlConfig} based on the deserialized config data.
 *
 * @param codigaYmlConfig The Codiga config in which rulesets are being configured
 * @param yamlContent The content of the codiga.yml file
 */
const setIgnore = (
  codigaYmlConfig: CodigaYmlConfig,
  yamlContent: any
): void => {
  if (yamlContent["ignore"] && Array.isArray(yamlContent["ignore"])) {
    const rulesetIgnores = yamlContent["ignore"] as object[];
    rulesetIgnores.filter(rulesetIgnore => rulesetIgnore !== null).forEach(rulesetIgnore => {
      /*
        When the ignore config is specified like this (with a string ruleset name):
        ignore:
          - my-python-ruleset

        there would be a separate entry for each character of the ruleset name: {'0', 'm'}, {'1', 'y'}, ...
        Thus, we prevent processing such entries by allowing only valid ruleset names to be saved.
      */
      for (const [rulesetName, ruleIgnores] of Object.entries(rulesetIgnore)) {
        if (CODIGA_RULESET_NAME_PATTERN.test(rulesetName))
          codigaYmlConfig.ignore.set(rulesetName, new RulesetIgnore(rulesetName, ruleIgnores));
      }
    });
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
  const codigaConfig = await parseCodigaConfig(codigaFile);

  // no rulesets to query, just exit
  if (!codigaConfig.rulesetNames || codigaConfig.rulesetNames.length === 0) {
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
    const rulesTimestamp = await getRulesLastUpdatedTimestamp(codigaConfig.rulesetNames);

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
    const rules = await getRules(codigaConfig.rulesetNames);

    const newCacheData: CacheData = {
      codigaYmlConfig: codigaConfig,
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
 * @param pathOfAnalyzedFile the absolute path of the file being analyzed.
 * Required to pass in for the `ignore` configuration.
 * @returns an array containing only the rules needed for a file to analyze
 */
export const getRosieRules = (
  language: Language,
  rules: Rule[] | undefined,
  pathOfAnalyzedFile: vscode.Uri
) => {
  if (!rules) return [];

  let rosieRulesForLanguage: Rule[] = [];
  switch (language) {
    case Language.Python:
      rosieRulesForLanguage = filterRules([Language.Python], rules);
      break;
    case Language.Javascript:
      rosieRulesForLanguage = filterRules([Language.Javascript], rules);
      break;
    case Language.Typescript:
      rosieRulesForLanguage = filterRules([Language.Javascript, Language.Typescript], rules);
      break;
  }

  if (!rosieRulesForLanguage)
    return [];

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(pathOfAnalyzedFile);
  if (workspaceFolder) {
    const relativePathOfAnalyzedFile = pathOfAnalyzedFile.fsPath
      .replace(workspaceFolder?.uri.fsPath, "")
      //Replaces backslash '\' symbols with forward slashes '/', so that in case of Windows specific paths,
      // we still can compare the relative paths properly.
      // Global match is applied to return all matches.
      .replace(/\\/g, "/");

    return rosieRulesForLanguage.filter(rosieRule => {
      const ruleIgnore = RULES_CACHE.get(workspaceFolder)
        ?.codigaYmlConfig
        .ignore.get(rosieRule.rulesetName)
        ?.ruleIgnores.get(rosieRule.ruleName);

      //If there is no ruleset ignore or rule ignore for the current RosieRule,
      // then we keep it/don't ignore it.
      if (!ruleIgnore)
        return true;

      //If there is no prefix specified for the current rule ignore config,
      // we don't keep the rule/ignore it.
      if (!ruleIgnore.prefixes || ruleIgnore.prefixes.length === 0)
        return false;

      return ruleIgnore.prefixes
        //Since the leading / is optional, we remove it
        .map(removeLeadingSlash)
        //./, /. and .. sequences are not allowed in prefixes, therefore we consider them not matching the file path.
        //. symbols in general are allowed to be able to target exact file paths with their file extensions.
        .every(prefix =>
          prefix.includes("..")
          || prefix.includes("./")
          || prefix.includes("/.")
          || !removeLeadingSlash(relativePathOfAnalyzedFile).startsWith(prefix));
    });
  }

  return [];
};

const removeLeadingSlash = (path: string): string => {
  return path.startsWith("/") ? path.replace("/", "") : path;
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
      ? getRosieRules(getLanguageForDocument(doc), rules, doc.uri)
      : [];
  }
  return [];
};

/**
 * Represents a codiga.yml configuration file.
 */
export class CodigaYmlConfig {
  static readonly EMPTY: CodigaYmlConfig = new CodigaYmlConfig();

  rulesetNames: string[];
  /**
   * Stores [ruleset name -> ruleset ignore configuration] mappings.
   *
   * Using a Map instead of a `RulesetIgnore[]` array, so that we can query the ruleset
   * configs by name, without having to filter the list by the ruleset name.
   */
  ignore: Map<string, RulesetIgnore>;

  constructor(rulesetNames: string[] = [], ignore: Map<string, RulesetIgnore> = new Map<string, RulesetIgnore>()) {
    this.rulesetNames = rulesetNames;
    this.ignore = ignore;
  }
}

/**
 * Represents a ruleset ignore configuration element in the codiga.yml file.
 *
 * This is the element right under the root-level `ignore` property, e.g.:
 * ```yaml
 *   - my-python-ruleset:
 *       - rule1:
 *           - prefix: /path/to/file/to/ignore
 * ```
 */
export class RulesetIgnore {
  rulesetName: string;
  /**
   * Stores [rule name -> rule ignore configuration] mappings.
   *
   * Using a Map instead of a `RuleIgnore` array, so that we can query the ruleset
   * configs by name, without having to filter the list by the ruleset name.
   */
  ruleIgnores: Map<string, RuleIgnore>;

  constructor(rulesetName: string, ruleIgnores: object) {
    this.rulesetName = rulesetName;
    this.ruleIgnores = new Map<string, RuleIgnore>();

    if (Array.isArray(ruleIgnores)) {
      ruleIgnores.filter(ruleIgnore => ruleIgnore !== null).forEach(ruleIgnore => {
        /*
          A rule ignore config can be a single rule name without any prefix value:
              - rulename
        */
        if (typeof ruleIgnore === "string") {
          this.ruleIgnores.set(ruleIgnore, new RuleIgnore(ruleIgnore));
        }
        /*
          A rule ignore config can be a Map of the rule name and its object value,
          with one or more prefix values:
              - rulename:
                - prefix: /path/to/file/to/ignore

              - rulename2:
                - prefix:
                  - /path1
                  - /path2
        */
        else if (typeof ruleIgnore === "object") {
          for (const [ruleName, prefixIgnores] of Object.entries(ruleIgnore)) {
            this.ruleIgnores.set(ruleName, new RuleIgnore(ruleName, prefixIgnores as object));
          }
        }
      });
    }
  }
}

/**
 * Represents a rule ignore configuration element in the codiga.yml file.
 *
 * This is the element right under a ruleset name property, e.g.:
 * ```yaml
 *       - rule1:
 *           - prefix: /path/to/file/to/ignore
 * </pre>
 * or
 * <pre>
 *       - rule2:
 *           - prefix:
 *               - /path1
 *               - /path2
 * ```
 */
export class RuleIgnore {
  ruleName: string;
  /**
   * The list of prefix values under the `prefix` property.
   *
   * In case multiple `prefix` properties are defined under the same rule config,
   * they are all added to this list.
   *
   * For example, in case of:
   * ```yaml
   * ignore:
   *   - my-python-ruleset:
   *     - rule1:
   *       - prefix:
   *         - /path1
   *         - /path2
   *       - prefix: /path3
   * ```
   * all of `/path1`, `/path2` and `/path3` are stored here.
   *
   * In case a `prefix` property contains the same value multiple times,
   * they are deduplicated and only once instance is stored, for example:
   * ```yaml
   * ignore:
   *   - my-python-ruleset:
   *     - rule1:
   *       - prefix:
   *         - /path1
   *         - /path1
   * ```
   */
  prefixes: string[];

  constructor(ruleName: string, prefixIgnores?: object) {
    this.ruleName = ruleName;
    this.prefixes = [];

    if (Array.isArray(prefixIgnores)) {
      prefixIgnores.filter(prefixIgnore => prefixIgnore !== null).forEach(prefixIgnore => {
        for (const [prefixKey, prefixes] of Object.entries(prefixIgnore)) {
          /*
            When the ignore config is specified like this (with a string 'prefix'):
            ignore:
            - my-python-ruleset:
              - rule1:
                - prefix

            there would be a separate entry for each character of the 'prefix' key: {'0', 'p'}, {'1', 'r'}, ...
            Thus, we prevent processing such entries by allowing only keys named 'prefix'.
          */
          if (prefixKey !== "prefix")
            return;

          /*
            A 'prefix' property can have a single String value:
                - prefix: /path/to/file/to/ignore
          */
          if (typeof prefixes === "string") {
            //This prevents adding the same prefix multiple times
            if (this.prefixes.indexOf(prefixes) < 0) {
              this.prefixes.push(prefixes);
            }
          }
          /*
            A 'prefix' property can also have multiple String values as a list:
                - prefix:
                  - /path1
                  - /path2
          */
          else if (Array.isArray(prefixes)) {
            (prefixes as string[]).forEach(prefix => {
              //This prevents adding the same prefix multiple times
              if (this.prefixes.indexOf(prefix) < 0) {
                this.prefixes.push(prefix);
              }
            });
          }
        }
      });
    }
  }
}
