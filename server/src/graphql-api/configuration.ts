export let codigaApiToken: any;

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
