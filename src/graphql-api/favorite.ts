import { getUserFingerprint } from "../utils/configurationUtils";
import { doQuery } from "./client";
import { SUBSCRIBE_TO_RECIPE, UNSUBSCRIBE_TO_RECIPE } from "./queries";
import { AssistantRecipe } from "./types";

export async function favoriteSnippet(
  snippet: AssistantRecipe
): Promise<boolean> {
  const variables: Record<string, number> = {
    id: snippet.id,
  };

  const subscribe = await doQuery(SUBSCRIBE_TO_RECIPE, variables);
  if (!subscribe) {
    return false;
  }

  return true;
}

export async function unfavoriteSnippet(
  snippet: AssistantRecipe
): Promise<boolean> {
  const variables: Record<string, number> = {
    id: snippet.id,
  };

  const subscribe = await doQuery(UNSUBSCRIBE_TO_RECIPE, variables);
  if (!subscribe) {
    return false;
  }

  return true;
}
