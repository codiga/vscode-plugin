// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

import { initializeClient } from "./graphql/client";
import { getUser } from "./graphql/user";
import { DIAGNOSTICS_COLLECTION_NAME } from "./constants";
import { subscribeToDocumentChanges } from "./diagnostics/diagnostics";
import { testApi } from "./commands/test-api";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  initializeClient();

  const user = await getUser();

  if (!user) {
    vscode.window.showInformationMessage(
      "Codiga: invalid API keys, configure your API keys"
    );
  }

  const diagnotics = vscode.languages.createDiagnosticCollection(
    DIAGNOSTICS_COLLECTION_NAME
  );
  context.subscriptions.push(diagnotics);

  subscribeToDocumentChanges(context, diagnotics);

  let disposable = vscode.commands.registerCommand("codiga.testAPI", () => {
    testApi();
  });

  context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {}
