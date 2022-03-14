// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

import { initializeClient } from "./graphql-api/client";
import {
  DIAGNOSTICS_COLLECTION_NAME,
  IGNORE_VIOLATION_COMMAND,
  LEARN_MORE_COMMAND,
  AUTO_COMPLETION_CHARACTER_TRIGGER,
  MESSAGE_STARTUP_SHOW_SHORTCUTS,
  MESSAGE_STARTUP_SHOW_SNIPPETS,
  MESSAGE_STARTUP_DO_NOT_SHOW_AGAIN,
  STARTUP_MESSAGE_MACOS,
  STARTUP_MESSAGE_WINDOWS,
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
import { useRecipe } from "./commands/use-recipe";
import { createRecipe } from "./commands/create-recipe";
import { providesCodeCompletion } from "./code-completion/assistant-completion";
import { useRecipeCallback } from "./graphql-api/use-recipe";
import { UriHandler } from "./utils/uriHandler";
import { getUser } from "./graphql-api/user";
import { listShorcuts } from "./commands/list-shortcuts";
import {
  disableShortcutsPolling,
  enableShortcutsPolling,
  fetchPeriodicShortcuts,
  fetchShortcuts,
} from "./graphql-api/shortcut-cache";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  initializeClient();
  initializeLocalStorage(context.workspaceState);

  const codigaStatusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    10
  );
  codigaStatusBar.command = "codiga.recipeExtended";
  context.subscriptions.push(codigaStatusBar);

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
  vscode.commands.registerCommand("codiga.testAPI", () => {
    testApi();
  });

  /**
   * Register the command to associate a project with Code Inspector.
   */
  vscode.commands.registerCommand("codiga.configureAssociatedProject", () => {
    configureProject();
  });
  /**
   * Register the command to read a recipe.
   */
  vscode.commands.registerCommand("codiga.recipeUse", () => {
    useRecipe(codigaStatusBar);
  });

  /**
   * Register the command to list shortcuts
   */
  vscode.commands.registerCommand("codiga.listShortcuts", () => {
    listShorcuts(codigaStatusBar);
  });

  /**
   * Command to create a recipe
   */
  vscode.commands.registerCommand("codiga.recipeCreate", () => {
    createRecipe();
  });

  /**
   * Register the command to see the register project
   */
  vscode.commands.registerCommand("codiga.getAssociatedProject", () => {
    getAssociatedProject();
  });

  /**
   * Register the command to send recipe usage information
   */
  vscode.commands.registerCommand(
    "codiga.registerUsage",
    async (id: number) => {
      await useRecipeCallback(id);
    }
  );

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

  vscode.window.registerUriHandler(new UriHandler());

  allLanguages.forEach((lang) => {
    const codeCompletionProvider =
      vscode.languages.registerCompletionItemProvider(
        lang,
        {
          async provideCompletionItems(
            document: vscode.TextDocument,
            position: vscode.Position
          ) {
            return await providesCodeCompletion(document, position);
          },
        },
        ...AUTO_COMPLETION_CHARACTER_TRIGGER
      );

    context.subscriptions.push(codeCompletionProvider);
  });

  /**
   * Finally, attempt to get the current user. If the current user
   * does not show, we propose to configure the API keys.
   */
  const currentUser = await getUser();
  if (!currentUser) {
    vscode.window.showInformationMessage(
      "Codiga API keys not set, [click here](https://app.codiga.io/account/auth/vscode) to configure your API keys."
    );
  }

  /**
   * Show a startup message for user to be familiar with the extension.
   */
  const configuration = vscode.workspace.getConfiguration("codiga");
  const shouldNotShowStartupMessage =
    !vscode.window.activeTextEditor ||
    (configuration.get("showWelcomeMessage") !== undefined &&
      configuration.get("showWelcomeMessage") === false);

  if (!shouldNotShowStartupMessage) {
    const startupMessage =
      process.platform === "darwin"
        ? STARTUP_MESSAGE_MACOS
        : STARTUP_MESSAGE_WINDOWS;
    vscode.window
      .showInformationMessage(
        startupMessage,
        MESSAGE_STARTUP_SHOW_SHORTCUTS,
        MESSAGE_STARTUP_SHOW_SNIPPETS,
        MESSAGE_STARTUP_DO_NOT_SHOW_AGAIN
      )
      .then((btn) => {
        if (btn === MESSAGE_STARTUP_SHOW_SHORTCUTS) {
          vscode.commands.executeCommand("codiga.listShortcuts");
        }
        if (btn === MESSAGE_STARTUP_SHOW_SNIPPETS) {
          vscode.commands.executeCommand("codiga.recipeUse");
        }
        if (btn === MESSAGE_STARTUP_DO_NOT_SHOW_AGAIN) {
          console.log("update config");
          configuration.update(
            "showWelcomeMessage",
            false,
            vscode.ConfigurationTarget.Global
          );
        }
      });
  }
  enableShortcutsPolling();
  fetchPeriodicShortcuts();

  /**
   * Whenever we open a document, we attempt to fetch the shortcuts
   * right when the document is open.
   */
  vscode.workspace.onDidOpenTextDocument(async () => {
    try {
      await fetchShortcuts();
      vscode.workspace;
    } catch (e) {
      console.debug("Error when trying to fetch shortcuts");
      console.debug(e);
    }
  });
}

// this method is called when your extension is deactivated
export function deactivate() {
  /**
   * Disable shortcut polling
   */
  disableShortcutsPolling();
}
