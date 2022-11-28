import * as vscode from "vscode";

/**
 * Get the API Token from the VScode preferences.
 * @returns
 */
export function getApiToken(): string | undefined {
  return vscode.workspace.getConfiguration().get("codiga.api.token");
}

export const isInlineCompletionEnabled = (): boolean => {
  const preferenceValue = vscode.workspace
    .getConfiguration()
    .get("codiga.editor.inlineCompletion") as boolean;
  return preferenceValue;
};

export const isShortcutCompletionEnabled = (): boolean => {
  const preferenceValue = vscode.workspace
    .getConfiguration()
    .get("codiga.editor.inlineCompletion") as boolean;
  return preferenceValue;
};

export const snippetVisibilityOnlySubscribed = (): boolean => {
  const preferenceValue = vscode.workspace
    .getConfiguration()
    .get("codiga.searchPreferences.onlySubscribed") as boolean;
  return preferenceValue;
};

export const snippetVisibilityOnlyPublic = (): boolean => {
  const preferenceValue = vscode.workspace
    .getConfiguration()
    .get("codiga.searchPreferences.searchVisibility") as string;
  return preferenceValue === "public";
};

export const snippetVisibilityOnlyPrivate = (): boolean => {
  const preferenceValue = vscode.workspace
    .getConfiguration()
    .get("codiga.searchPreferences.searchVisibility") as string;
  return preferenceValue === "private";
};
