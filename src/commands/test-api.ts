import * as vscode from "vscode";

import { getUser } from "../graphql-api/user";

/**
 * Verify access to the API and display an error
 * if the user is not logged in.
 */
export async function testApi(): Promise<void> {
  const user = await getUser();
  if (!user) {
    vscode.window.showInformationMessage(
      "Invalid API keys. Enter valid API keys from your Code Inspector profile"
    );
  } else {
    vscode.window.showInformationMessage(
      `Code Inspector: identified as ${user.username} (${user.accountType})`
    );
  }
}
