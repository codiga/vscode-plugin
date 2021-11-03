import * as vscode from "vscode";
import { getFromLocalStorage, setToLocalStorage } from "./localStorage";

/**
 * Get the project current associated with the current workspace.
 * @returns either the associated project or undefined.
 */
export function getAssociatedProjectIdentifier(): number | undefined {
  if (vscode.window.activeTextEditor) {
    const currentDocument = vscode.window.activeTextEditor.document;
    const configuration = vscode.workspace.getConfiguration(
      "",
      currentDocument.uri
    );

    return configuration.get("codiga.associatedProject");
  } else {
    return undefined;
  }
}

/**
 * Get the project current associated with the current workspace.
 * @returns either the associated project or undefined.
 */
export function isAnalysisEnabled(): boolean {
  return (
    vscode.workspace.getConfiguration().get("codiga.codeAnalysisEnabled") ||
    true
  );
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
