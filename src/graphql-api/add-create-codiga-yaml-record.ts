import { getUserFingerprint } from "../utils/configurationUtils";
import { doMutation } from "./client";
import { USE_CREATE_CODIGA_YAML } from "./mutations";

/**
 * creates a record when the user creates a codiga.yml file through
 * our VSCode suggestion popup
 */
export async function addCreateCodigaYamlRecord(): Promise<void> {
  // Get the fingerprint from localstorage to initiate the request
  const userFingerprint = getUserFingerprint();

  // record that a rule fix has taken place
  await doMutation(USE_CREATE_CODIGA_YAML, {
    fingerprint: userFingerprint,
  });
}
