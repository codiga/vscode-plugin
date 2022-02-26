import * as vscode from "vscode";
import { getUser } from "../graphql-api/user";

/**
 * Show the user logged in in the status bar.
 */
export const showUser = async (
  statusBar: vscode.StatusBarItem
): Promise<void> => {
  const user = await getUser();
  if (!user) {
    statusBar.text = "Codiga ready (anonymous)";
    statusBar.show();
  } else {
    statusBar.text = `Codiga ready (${user.username})`;
    statusBar.show();
  }
};
