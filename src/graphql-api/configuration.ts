import * as vscode from "vscode";

/**
 * Get the API Token from the VScode preferences.
 * @returns
 */
export function getApiToken(): string | undefined {
  return vscode.workspace.getConfiguration().get("code-inspector.api.token");
}

/**
 * Get the access key from the VScode preferences.
 * @returns
 */
export function getAccessKey(): string | undefined {
  return vscode.workspace
    .getConfiguration()
    .get("code-inspector.api.accessKey");
}

/**
 * Get the secret key from the VScode preferences.
 * @returns
 */
export function getSecretKey(): string | undefined {
  return vscode.workspace
    .getConfiguration()
    .get("code-inspector.api.secretKey");
}

/**
 * Check that access and secret keys are configured
 * @returns true if keys are configured
 */
export function hasKeys(): boolean {
  const accessKey = getAccessKey();
  const secretKey = getSecretKey();
  if (typeof accessKey === "undefined" || typeof secretKey === "undefined") {
    return false;
  }
  if (accessKey.length == 0 || secretKey.length == 0) {
    return false;
  }
  if (accessKey === "<ACCESS-KEY>" || secretKey === "<SECRET-KEY>") {
    return false;
  }
  return true;
}
