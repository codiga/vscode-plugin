import { doMutation } from "./client";

import { getUserFingerprint } from "../utils/configurationUtils";
import { USE_RECIPE } from "./mutations";

/**
 * Callback to indicate we used a recipe
 *
 * @param filename - the filename being edited
 * @param keywords - all the keywords for the search
 * @param language - the language to analyze
 * @param dependencies - the list of dependencies of the system
 * @returns
 */

export async function useRecipeCallback(recipeId: number): Promise<void> {
  // Convert array of parameters into k1=v1;k2=v2

  // Get the fingerprint from localstorage to initiate the request
  const userFingerprint = getUserFingerprint();

  const variables: Record<string, string | undefined | number | null> = {
    recipeId: recipeId,
    fingerprint: userFingerprint,
  };

  await doMutation(USE_RECIPE, variables);
}
