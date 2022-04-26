import { doQuery } from "./client";
import { AssistantRecipe, Language } from "./types";
import {
  GET_RECIPES_BY_SHORTCUT,
  GET_RECIPES_BY_SHORTCUT_LAST_TIMESTAMP,
  GET_RECIPES_SEMANTIC,
} from "./queries";
import { getUserFingerprint } from "../utils/configurationUtils";

/**
 * Get all the recipe for the client.
 *
 * @param filename - the filename being edited
 * @param keywords - all the keywords for the search
 * @param language - the language to analyze
 * @param dependencies - the list of dependencies of the system
 * @returns
 */

export async function getRecipesForClient(
  term: string | undefined,
  filename: string | undefined,
  language: Language,
  dependencies: string[],
  onlyPublic: boolean | undefined = undefined,
  onlyPrivate: boolean | undefined = undefined,
  onlySubscribed: boolean | undefined = undefined
): Promise<AssistantRecipe[]> {
  // Get the fingerprint from localstorage to initiate the request
  const userFingerprint = getUserFingerprint();

  const variables: Record<
    string,
    string | undefined | number | null | string[] | boolean
  > = {
    language: language,
    term: term,
    howmany: 10,
    skip: 0,
    dependencies: dependencies,
    filename: filename,
    fingerprint: userFingerprint,
    parameters: null,
    onlyPublic: onlyPublic,
    onlyPrivate: onlyPrivate,
    onlySubscribed: onlySubscribed,
  };

  const recipes = await doQuery(GET_RECIPES_SEMANTIC, variables);
  console.log(recipes);

  if (!recipes) {
    return [];
  }

  return recipes.assistantRecipesSemanticSearch;
}

export async function getRecipesForClientByShorcut(
  term: string | undefined,
  filename: string | undefined,
  language: Language,
  dependencies: string[]
): Promise<AssistantRecipe[]> {
  // Convert array of parameters into k1=v1;k2=v2

  // Get the fingerprint from localstorage to initiate the request
  const userFingerprint = getUserFingerprint();

  const variables: Record<
    string,
    string | undefined | number | null | string[]
  > = {
    language: language,
    term: term,
    dependencies: dependencies,
    filename: filename,
    fingerprint: userFingerprint,
    parameters: null,
  };

  const recipes = await doQuery(GET_RECIPES_BY_SHORTCUT, variables);
  if (!recipes) {
    return [];
  }

  return recipes.getRecipesForClientByShortcut;
}

export async function getRecipesForClientByShorcutLastTimestamp(
  language: Language,
  dependencies: string[]
): Promise<number | undefined> {
  // Convert array of parameters into k1=v1;k2=v2

  // Get the fingerprint from localstorage to initiate the request
  const userFingerprint = getUserFingerprint();

  const variables: Record<
    string,
    string | undefined | number | null | string[]
  > = {
    language: language,
    dependencies: dependencies,
    fingerprint: userFingerprint,
  };

  const lastTimestamp = await doQuery(
    GET_RECIPES_BY_SHORTCUT_LAST_TIMESTAMP,
    variables
  );
  if (!lastTimestamp) {
    return undefined;
  }

  return lastTimestamp.getRecipesForClientByShortcutLastTimestamp;
}
