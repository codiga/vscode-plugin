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
  LEARN_MORE_COMMAND
} from "./constants";
import { testApi } from "./commands/test-api";
import { initializeLocalStorage } from "./utils/localStorage";
import { useRecipe } from "./commands/use-recipe";
import { createRecipe } from "./commands/create-recipe";
import { providesCodeCompletion } from "./features/assistant-completion";
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
import { provideInlineComplextion } from "./features/inline-completion";
import { AssistantRecipe } from "./graphql-api/types";
import { recordLastActivity } from "./utils/activity";
import { runCodigaFileSuggestion } from "./features/codiga-file-suggestion";
import { rollbarLogger } from "./utils/rollbarUtils";

import * as path from "path";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind
} from 'vscode-languageclient/node';
import { getUserFingerprint } from "./utils/configurationUtils";

let client: LanguageClient;
export var isInTestMode = false;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
  isInTestMode = context.extensionMode === vscode.ExtensionMode.Test;

  initializeClient();
  initializeLocalStorage(context.workspaceState);

  // ALWAYS record the first editor FIRST
  recordLastEditor();

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

  /**
   * Register the learn more command, this is a command that is pushed
   * when we have a diagnostic being shown for a violation.
   */
  context.subscriptions.push(
    vscode.commands.registerCommand(LEARN_MORE_COMMAND, (url) =>
      vscode.env.openExternal(vscode.Uri.parse(url))
    )
  );

  vscode.window.registerUriHandler(new UriHandler());

  allLanguages.forEach((lang) => {
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

  await runCodigaFileSuggestion();

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
      rollbarLogger(e);
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
      rollbarLogger(e);
    }
  });

  /**
   * Whenever the user switches to a different tab, we record the new active text editor,
   * so that Codiga Assistant preview/insert has a target editor to work with.
   */
  vscode.window.onDidChangeActiveTextEditor(editor => {
    if (editor)
      recordLastEditor();
  });

  /**
   * Record when a doc is changed so that we know when the user
   * is active or not.
   */
  vscode.workspace.onDidChangeTextDocument(() => {
    recordLastActivity();
  });

  initializeLanguageClient(context);
}

/**
 * Initializes and launches the language client.
 *
 * @param context the vscode extension context
 */
function initializeLanguageClient(context: vscode.ExtensionContext) {
  // The compiled artifact from our server/server.ts is our server that this client executes.
  const serverModule = context.asAbsolutePath(
      path.join('server', 'out', 'server.js')
  );
  // If the extension is launched in debug mode then the debug server options are used, otherwise the run options are used.
  // Since we have a plugin as a client application here, the fingerprint is generated and passed in as a command line argument.
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc, args: [`fingerprint=${getUserFingerprint()}`] },
    debug: { module: serverModule, transport: TransportKind.ipc, args: [`fingerprint=${getUserFingerprint()}`] }
  };

  // Options to control the language client
  const clientOptions: LanguageClientOptions = {
    //Lists the document languages that are targeted and selected by the language client
    // Language identifiers: https://code.visualstudio.com/docs/languages/identifiers#_known-language-identifiers
    // An alternative to this is using a file extension pattern based selector, e.g.:
    // documentSelector: [{ scheme: 'file', pattern: '**/*.{js,jsx,ts,tsx,py,py3}' }]*/
    documentSelector: [
      { scheme: 'file', language: 'javascript' },
      { scheme: 'file', language: 'javascriptreact' },
      { scheme: 'file', language: 'typescript' },
      { scheme: 'file', language: 'typescriptreact' },
      { scheme: 'file', language: 'python' }
    ]
  };

  // Create the language client and start the client.
  client = new LanguageClient(
      'codigaLanguageServer',
      'Codiga Language Server',
      serverOptions,
      clientOptions
  );

  // Start the client. This will also launch the server.
  client.start();
}

/**
 * This method is called when your extension is deactivated.
 */
export function deactivate() {
  //Disable shortcut polling
  disableShortcutsPolling();

  //Stop the language client
  if (!client) {
    return undefined;
  }
  return client.stop();
}
