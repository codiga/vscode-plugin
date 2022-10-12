// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

import { initializeClient } from "./graphql-api/client";
import {
  AUTO_COMPLETION_CHARACTER_TRIGGER,
  MESSAGE_STARTUP_SHOW_SHORTCUTS,
  MESSAGE_STARTUP_SHOW_SNIPPETS,
  MESSAGE_STARTUP_DO_NOT_SHOW_AGAIN,
  STARTUP_MESSAGE_MACOS,
  STARTUP_MESSAGE_WINDOWS,
  VSCODE_DOCUMENTATION_URL,
  PREFERENCES_OPEN_BROWSER_AFTER_INSTALL,
  DIAGNOSTICS_COLLECTION_NAME,
} from "./constants";
import { testApi } from "./commands/test-api";
import {
  getFromLocalStorage,
  initializeLocalStorage,
  setToLocalStorage,
} from "./utils/localStorage";
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
import { removeRecentlyUsedRecipes } from "./commands/remove-recently-used-recipes";
import {
  recordLastEditor,
  showCodigaWebview,
  updateWebview,
} from "./commands/webview";
import { provideInlineComplextion } from "./code-completion/inline-completion";
import { AssistantRecipe } from "./graphql-api/types";
import { subscribeToDocumentChanges } from "./diagnostics/diagnostics";
import { applyFix, RosieFixAction } from "./rosie/rosiefix";
import { RosieFix } from "./rosie/rosieTypes";
import { refreshCachePeriodic } from "./rosie/rosieCache";
import { recordLastActivity } from "./utils/activity";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  initializeClient();
  initializeLocalStorage(context.workspaceState);

  // ALWAYS record the first editor FIRST
  recordLastEditor();

  // Create diagnostics and register them
  const diagnostics = vscode.languages.createDiagnosticCollection(
    DIAGNOSTICS_COLLECTION_NAME
  );
  context.subscriptions.push(diagnostics);

  subscribeToDocumentChanges(context, diagnostics);

  const codigaStatusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    10
  );
  codigaStatusBar.command = "codiga.recipeExtended";
  context.subscriptions.push(codigaStatusBar);

  // Get all language supported by vscode
  const allLanguages = await vscode.languages.getLanguages();

  /**
   * Register the command to test the connection to the Code Inspector API.
   */
  vscode.commands.registerCommand("codiga.testAPI", () => {
    testApi();
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
   * Removes all recently used recipes in local storage
   */
  vscode.commands.registerCommand("codiga.removeRecentlyUsedRecipes", () => {
    removeRecentlyUsedRecipes();
  });

  vscode.commands.registerCommand("codiga.showWebview", async () => {
    await showCodigaWebview(context);
  });

  /**
   * Register the command to send recipe usage information
   * We should save it to local storage so they're listed first on future calls
   */
  vscode.commands.registerCommand(
    "codiga.registerUsage",
    async (id: number, language: string, shortcut?: string) => {
      await useRecipeCallback(id, language, shortcut);
    }
  );

  /**
   * Action to apply a fix for Rosie. This action is called
   * by the code analysis handler.
   */
  vscode.commands.registerCommand(
    "codiga.applyFix",
    async (document: vscode.TextDocument, fix: RosieFix) => {
      console.log("doc");
      console.log(document);
      console.log("fix");
      console.log(fix);
      await applyFix(document, fix);
    }
  );

  /**
   * Remove a line from the current active text editor. Used for the line
   * code completion
   */
  vscode.commands.registerCommand(
    "codiga.cleanLineAndRegisterUsage",
    async (
      snippet: AssistantRecipe,
      document: vscode.TextDocument,
      lineNumber: number
    ) => {
      await vscode.window.activeTextEditor?.edit((editBuilder) => {
        editBuilder.delete(new vscode.Range(lineNumber, 0, lineNumber + 1, 0));
      });
      await useRecipeCallback(snippet.id, snippet.language, undefined);
    }
  );

  vscode.window.registerUriHandler(new UriHandler());

  allLanguages.forEach((lang) => {
    context.subscriptions.push(
      vscode.languages.registerCodeActionsProvider(lang, new RosieFixAction(), {
        providedCodeActionKinds: RosieFixAction.providedCodeActionKinds,
      })
    );

    const inlineProvider: vscode.InlineCompletionItemProvider = {
      provideInlineCompletionItems: async (
        document,
        position,
        context,
        token
      ) => {
        return provideInlineComplextion(document, position, context, token);
      },
    };

    vscode.languages.registerInlineCompletionItemProvider(lang, inlineProvider);

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
          configuration.update(
            "showWelcomeMessage",
            false,
            vscode.ConfigurationTarget.Global
          );
        }
      });
  }
  enableShortcutsPolling();
  fetchPeriodicShortcuts(); // refresh available shortcuts periodically
  refreshCachePeriodic(); // refresh rules available for all workspaces

  /**
   * Whenever we open a document, we attempt to fetch the shortcuts
   * right when the document is open.
   */
  vscode.workspace.onDidOpenTextDocument(async () => {
    try {
      await fetchShortcuts();
    } catch (e) {
      console.debug("Error when trying to fetch shortcuts");
      console.debug(e);
    }
  });

  /**
   * Whenever we open a new document, we refresh the webview
   */
  vscode.workspace.onDidOpenTextDocument(async () => {
    try {
      recordLastActivity();
      recordLastEditor();
      await updateWebview();
    } catch (e) {
      console.debug("Error when trying to refresh the webview");
      console.debug(e);
    }
  });

  /**
   * Record when a doc is changed so that we know when the user
   * is active or not.
   */
  vscode.workspace.onDidChangeTextDocument(() => {
    recordLastActivity();
  });

  /**
   * Open the VSCode integration documentation only once after user installs it
   * We store in a preference if we should open the browser.
   */
  const shouldOpenBrowser =
    configuration.get(PREFERENCES_OPEN_BROWSER_AFTER_INSTALL) === undefined ||
    configuration.get(PREFERENCES_OPEN_BROWSER_AFTER_INSTALL) === true;
  if (shouldOpenBrowser) {
    await configuration.update(
      PREFERENCES_OPEN_BROWSER_AFTER_INSTALL,
      false,
      vscode.ConfigurationTarget.Global
    );
    await vscode.env.openExternal(vscode.Uri.parse(VSCODE_DOCUMENTATION_URL));
  }
}

// this method is called when your extension is deactivated
export function deactivate() {
  /**
   * Disable shortcut polling
   */
  disableShortcutsPolling();
}
