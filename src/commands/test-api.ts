import * as vscode from "vscode";

import { getUser } from "../graphql/user";

export async function testApi() {
  const user = await getUser();
  if (!user) {
    vscode.window.showInformationMessage("Invalid API keys");
  } else {
    vscode.window.showInformationMessage(`Codiga: identified as ${user}`);
  }
}
