import { connection } from '../server';

export let codigaApiToken: any;

/**
 * Get the Codiga API Token from the client application preferences.
 */
export async function getApiToken(): Promise<any> {
  if (!codigaApiToken) {
    cacheCodigaApiToken();
  }
  return codigaApiToken;
}

/**
 * Caches the api token on server side to minimize the server to client calls.
 */
export async function cacheCodigaApiToken() {
  codigaApiToken = await connection.workspace.getConfiguration("codiga.api.token");
}
