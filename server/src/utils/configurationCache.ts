import {WorkspaceFolder} from "vscode-languageserver";

let currentFingerprint: string | undefined;
let codigaApiToken: any;
let workspaceFolders: WorkspaceFolder[] = [];

// -------- Fingerprint --------

/**
 * Caches the user fingerprint regardless if it is generated on the client or on server side.
 *
 * @param fingerprint
 */
export function cacheUserFingerprint(fingerprint: string | undefined) {
  currentFingerprint = fingerprint;
}

const generateRandomString = (length: number) => {
  // Declare all characters
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  let str = "";
  for (let i = 0; i < length; i++) {
    str += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return str;
};

/**
 * Get the user fingerprint from the configuration.
 *
 * Currently, if the fingerprint is generated on server side, it is re-generated for each launch of the language server.
 */
export function getUserFingerprint(): string {
  if (currentFingerprint) {
    return currentFingerprint;
  }

  const newFingerprint = generateRandomString(10);
  currentFingerprint = newFingerprint;

  return newFingerprint;
}

// -------- Codiga API Token --------

/**
 * Get the Codiga API Token from the client application preferences.
 */
export function getApiToken(): any {
  return codigaApiToken;
}

/**
 * Caches the api token on server side to minimize the server to client calls.
 */
export async function cacheCodigaApiToken(apiToken: any) {
  codigaApiToken = apiToken;
}

// -------- Workspace folders --------

/**
 * Saves the argument workspace folders. If null is provided, then an empty list is cached.
 *
 * @param folders the workspacefolders to cache
 */
export function cacheWorkspaceFolders(folders: WorkspaceFolder[] | null) {
  workspaceFolders = folders ?? [];
}

/**
 * Returns the workspace folders from this cache.
 */
export function getWorkspaceFolders(): WorkspaceFolder[] {
  return workspaceFolders;
}
