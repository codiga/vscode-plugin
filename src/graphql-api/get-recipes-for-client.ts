import { doQuery } from "./client";
import { AssistantRecipe, Language } from "./types";
import { GET_RECIPES } from "./queries";
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
  keywords: string[],
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
    keywords: keywords,
    dependencies: dependencies,
    filename: filename,
    fingerprint: userFingerprint,
    parameters: null,
  };

  const recipes = await doQuery(GET_RECIPES, variables);

  if (!recipes) {
    console.log("no getRecipes");
    return [];
  }

  return recipes.getRecipesForClient;
}
