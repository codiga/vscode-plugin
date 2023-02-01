let currentFingerprint: string | undefined;

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
