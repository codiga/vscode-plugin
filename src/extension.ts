// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

import { initializeClient } from "./graphql-api/client";
import { getUser } from "./graphql-api/user";
import {
  DIAGNOSTICS_COLLECTION_NAME,
  IGNORE_VIOLATION_COMMAND,
  LEARN_MORE_COMMAND,
} from "./constants";
import { subscribeToDocumentChanges } from "./diagnostics/diagnostics";
import { testApi } from "./commands/test-api";
import { configureProject } from "./commands/configure-associated-project";
import { MoreInfo } from "./code-actions/more-info";
import { getAssociatedProject } from "./commands/get-associated-project";
import { ignoreViolation } from "./commands/ignore-violation";
import { IgnoreViolationCodeAction } from "./code-actions/ignore-violation";
import { FileAnalysisViolation } from "./graphql-api/types";
import { IgnoreViolationType } from "./utils/IgnoreViolationType";
import { initializeLocalStorage } from "./utils/localStorage";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  initializeClient();
  initializeLocalStorage(context.workspaceState);

  const user = await getUser();

  // if (!user) {
  //   vscode.window.showInformationMessage(
  //     "Code Inspector: invalid API keys, configure your API keys"
  //   );
  // }

  const diagnotics = vscode.languages.createDiagnosticCollection(
    DIAGNOSTICS_COLLECTION_NAME
  );
  context.subscriptions.push(diagnotics);

  // Get all language supported by vscode
  const allLanguages = await vscode.languages.getLanguages();

  // add support of code action for each language
  allLanguages.forEach((lang) => {
    context.subscriptions.push(
      vscode.languages.registerCodeActionsProvider(lang, new MoreInfo(), {
        providedCodeActionKinds: MoreInfo.providedCodeActionKinds,
      })
    );
    context.subscriptions.push(
      vscode.languages.registerCodeActionsProvider(
        lang,
        new IgnoreViolationCodeAction(),
        {
          providedCodeActionKinds:
            IgnoreViolationCodeAction.providedCodeActionKinds,
        }
      )
    );
  });

  subscribeToDocumentChanges(context, diagnotics);

  /**
   * Register the command to test the connection to the Code Inspector API.
   */
  vscode.commands.registerCommand("code-inspector.testAPI", () => {
    testApi();
  });

  /**
   * Register the command to associate a project with Code Inspector.
   */
  vscode.commands.registerCommand(
    "code-inspector.configureAssociatedProject",
    () => {
      configureProject();
    }
  );

  /**
   * Register the command to see the register project
   */
  vscode.commands.registerCommand("code-inspector.getAssociatedProject", () => {
    getAssociatedProject();
  });

  /**
   * Register the learn more command, this is a command that is pushed
   * when we have a diagnostic being shown for a violation.
   */
  context.subscriptions.push(
    vscode.commands.registerCommand(LEARN_MORE_COMMAND, (url) =>
      vscode.env.openExternal(vscode.Uri.parse(url))
    )
  );

  /**
   * Register the command to ignore a diagnostic. This is a command
   * that is pushed when we have a diagnostic being shown/surfaced.
   */
  context.subscriptions.push(
    vscode.commands.registerCommand(
      IGNORE_VIOLATION_COMMAND,
      async (
        ignoreViolationType: IgnoreViolationType,
        violation: FileAnalysisViolation
      ) => await ignoreViolation(ignoreViolationType, violation)
    )
  );
}

// this method is called when your extension is deactivated
export function deactivate() {}
