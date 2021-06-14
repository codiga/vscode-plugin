// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

import { initializeClient } from "./graphql/client";
import { getUser } from "./graphql/user";
import { DIAGNOSTICS_COLLECTION_NAME, LEARN_MORE_COMMAND } from "./constants";
import { subscribeToDocumentChanges } from "./diagnostics/diagnostics";
import { testApi } from "./commands/test-api";
import { MoreInfo } from "./code-actions/more-info";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  initializeClient();

  const user = await getUser();

  if (!user) {
    vscode.window.showInformationMessage(
      "Code Inspector: invalid API keys, configure your API keys"
    );
  }

  const diagnotics = vscode.languages.createDiagnosticCollection(
    DIAGNOSTICS_COLLECTION_NAME
  );
  context.subscriptions.push(diagnotics);

  // Get all language supported by vscode
  const allLanguages = await vscode.languages.getLanguages();
  
  // add support of code action for each language
  allLanguages.forEach(lang => {
    context.subscriptions.push(
		  vscode.languages.registerCodeActionsProvider(lang, new MoreInfo(), {
			  providedCodeActionKinds: MoreInfo.providedCodeActionKinds
		})
	);
  });


  subscribeToDocumentChanges(context, diagnotics);

  let disposable = vscode.commands.registerCommand("code-inspector.testAPI", () => {
    testApi();
  });

  context.subscriptions.push(disposable);

  context.subscriptions.push(
    vscode.commands.registerCommand(LEARN_MORE_COMMAND, (url) => vscode.env.openExternal(vscode.Uri.parse(url)))
  );
}

// this method is called when your extension is deactivated
export function deactivate() {}
