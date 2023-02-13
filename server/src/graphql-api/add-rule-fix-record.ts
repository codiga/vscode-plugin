import { getUserFingerprint } from "../utils/configurationCache";
import { doMutation } from "./client";
import { USE_RULE_FIX } from "./mutations";

/**
 * creates a record when a rule fix was applied in the editor
 */
export async function addRuleFixRecord(): Promise<void> {
  // Get the fingerprint from localstorage to initiate the request
  const userFingerprint = getUserFingerprint();

  // record that a rule fix has taken place
  await doMutation(USE_RULE_FIX, {
    fingerprint: userFingerprint,
  });
}
