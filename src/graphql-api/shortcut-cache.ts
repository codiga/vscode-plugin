import * as vscode from "vscode";
import {
  CODING_ASSISTANT_MAX_TIME_IN_CACHE_MS,
  CODING_ASSISTANT_SHORTCUTS_POLLING_MS,
} from "../constants";
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
  lastAccessTimestampMs: number;
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

export const garbageCollection = (
  cacheToCollect: Map<string, ShortcutCacheValue>
) => {
  const nowMs = Date.now();
  const keysToCollect = [];

  /**
   * First, look at the keys we need to collect/remove
   * from the cache.
   */
  for (const key of cacheToCollect.keys()) {
    const cacheValue = cacheToCollect.get(key);
    if (cacheToCollect.has(key) && cacheValue) {
      /**
       * Was the data in the cache long enough?
       */
      if (
        cacheValue.lastAccessTimestampMs <
        nowMs - CODING_ASSISTANT_MAX_TIME_IN_CACHE_MS
      ) {
        keysToCollect.push(key);
      }
    }
  }

  /**
   * Remove the data from the cache.
   */
  keysToCollect.forEach((key) => {
    cacheToCollect.delete(key);
  });
};

/**
 * Fetch all shortcuts. This function is periodically
 * called using polling.
 * @returns
 */
export const fetchShortcuts = async () => {
  console.log("fetchShortcuts");
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

  const nowTimestampMs = Date.now();

  /**
   * We should fetch if and only if
   *  - there was no data before
   *  - there are new recipes available by shortcut
   */
  const cacheKeyString = JSON.stringify(cacheKey);
  const shouldFetch =
    !cache.has(cacheKeyString) ||
    cache.get(cacheKeyString)?.lastUpdateTimestampMs !== lastTimestamp;

  /**
   * If we should not fetch and there is data in the cache,
   * update the last access time so that the data is not marked
   * to be garbage collected.
   */
  if (!shouldFetch && cache.has(cacheKeyString)) {
    const currentValue = cache.get(cacheKeyString);
    if (currentValue) {
      currentValue.lastAccessTimestampMs = nowTimestampMs;
      cache.set(cacheKeyString, currentValue);
    }
  }

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
      lastAccessTimestampMs: nowTimestampMs,
      values: recipes,
    };
    // need to stringify since we take a string as a key
    const newCacheKey = JSON.stringify(cacheKey);
    cache.set(newCacheKey, cacheValue);
  }
};

/**
 * Until periodic polling is enable, execute
 * the polling function and wait for the next
 * execution.
 */
export const fetchPeriodicShortcuts = async () => {
  console.log("fetchPeriodicShortcuts");
  if (enablePeriodicPolling) {
    await fetchShortcuts().catch((e) => {
      console.error("error while fetching shortcuts");
    });
    garbageCollection(cache);
    setTimeout(fetchPeriodicShortcuts, CODING_ASSISTANT_SHORTCUTS_POLLING_MS);
  }
};
