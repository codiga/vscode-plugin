import { getFromLocalStorage, setToLocalStorage } from "./localStorage";

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
 */
export function getUserFingerprint(): string {
  const currentFingerprint: string | undefined =
    getFromLocalStorage("fingerprint");

  if (currentFingerprint) {
    return currentFingerprint;
  }

  const newFingerprint = generateRandomString(10);

  setToLocalStorage("fingerprint", newFingerprint);

  return newFingerprint;
}