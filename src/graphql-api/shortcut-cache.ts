import * as vscode from "vscode";
import { CODING_ASSISTANT_SHORTCUTS_POLLING_MS } from "../constants";
import { getDependencies } from "../utils/dependencies/get-dependencies";
import { getLanguageForDocument } from "../utils/fileUtils";
import {
  getRecipesForClientByShorcut,
  getRecipesForClientByShorcutLastTimestamp,
} from "./get-recipes-for-client";
import { AssistantRecipe, Language } from "./types";

let enablePeriodicPolling = true;

/**
 * Interface for cache key and cache values
 */
export interface ShortcutCacheKey {
  language: string;
  filename: string | undefined;
  dependencies: string[];
}

export interface ShortcutCacheValue {
  lastUpdateTimestampMs: number;
  values: AssistantRecipe[];
}

/**
 * The actual cache: a map that indexed by key/values
 */
const cache: Map<string, ShortcutCacheValue> = new Map();

/**
 * Function that is used by the completion to get all shortcuts
 * for a particular context. This is called by assistant-completion.ts.
 *
 * @param filename
 * @param language
 * @param dependencies
 * @returns
 */
export const getShortcutCache = (
  filename: string | undefined,
  language: Language,
  dependencies: string[]
): AssistantRecipe[] | undefined => {
  const cacheKey = {
    language: language,
    filename: filename,
    dependencies: dependencies,
  };
  const cacheKeyString = JSON.stringify(cacheKey);
  const cacheValue = cache.get(cacheKeyString);
  if (!cacheValue) {
    return undefined;
  } else {
    return cacheValue.values;
  }
};

/**
 * Disable polling. Set when the plugin is deactivated.
 */
export const disableShortcutsPolling = () => {
  enablePeriodicPolling = false;
};

/**
 * Enable shortcut polling. Set at startup.
 */
export const enableShortcutsPolling = () => {
  enablePeriodicPolling = true;
};

/**
 * Fetch all shortcuts. This function is periodically
 * called using polling.
 * @returns
 */
const fetchShortcuts = async () => {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }
  const document = editor.document;

  if (!document) {
    return;
  }
  const path = document.uri.path;

  const dependencies: string[] = await getDependencies(document);
  const relativePath = vscode.workspace.asRelativePath(path);
  const language: Language = getLanguageForDocument(document);

  const cacheKey: ShortcutCacheKey = {
    language: language,
    filename: relativePath,
    dependencies: dependencies,
  };

  const lastTimestamp = await getRecipesForClientByShorcutLastTimestamp(
    language,
    dependencies
  );

  /**
   * There is no recipe for this key, just leave this function
   */
  if (!lastTimestamp) {
    return;
  }

  /**
   * We should fetch if and only if
   *  - there was no data before
   *  - there are new recipes available by shortcut
   */

  const cacheKeyString = JSON.stringify(cacheKey);
  const shouldFetch =
    !cache.has(cacheKeyString) ||
    cache.get(cacheKeyString)?.lastUpdateTimestampMs !== lastTimestamp;

  if (shouldFetch) {
    const recipes = await getRecipesForClientByShorcut(
      undefined,
      relativePath,
      language,
      dependencies
    );
    // associated the new timestamp with the cache value
    const cacheValue: ShortcutCacheValue = {
      lastUpdateTimestampMs: lastTimestamp,
      values: recipes,
    };
    // need to stringify since we take a string as a key
    const newCacheKey = JSON.stringify(cacheKey);
    cache.set(newCacheKey, cacheValue);
  }
};

export const fetchPeriodicShortcuts = async () => {
  if (enablePeriodicPolling) {
    await fetchShortcuts().catch((e) => {
      console.error("error while fetching shortcuts");
    });
    setTimeout(fetchPeriodicShortcuts, CODING_ASSISTANT_SHORTCUTS_POLLING_MS);
  }
};
