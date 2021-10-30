import * as vscode from "vscode";
import { Language } from "../graphql-api/types";
import { getLanguageForDocument, getBasename } from "../utils/fileUtils";
import { getUserFingerprint } from "../utils/configurationUtils";
import { getDependencies } from "../utils/dependencies/get-dependencies";
import { getApiToken } from "../graphql-api/configuration";

/**
 * Use a Codiga recipe. Start the electron application and communicate
 * through a bridge in order to get all the recipes and recommendations.
 * @returns
 */
export async function useRecipe(): Promise<void> {
  if (vscode.window.activeTextEditor) {
    /**
     * Get all parameters for the request.
     */
    const doc = vscode.window.activeTextEditor.document;
    const path = doc.uri.path;
    const relativePath = vscode.workspace.asRelativePath(path);
    const language: Language = getLanguageForDocument(doc);
    const basename: string | undefined = getBasename(relativePath);
    const dependencies: string[] = await getDependencies(doc);

    // Get the fingerprint from localstorage to initiate the request
    const userFingerprint = getUserFingerprint();
    // Get the API token that we pass to the electron application
    const apiToken = getApiToken();

    console.log("filename");
    console.log(basename);
    console.log("language");
    console.log(language);
    console.log("fingerprint");
    console.log(userFingerprint);
    console.log("API Token");
    console.log(apiToken);
    console.log("dependencies");
    console.log(dependencies);
  }
}
