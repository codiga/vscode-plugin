import * as vscode from "vscode";
import * as path from "path";

import { getRecipesForClient } from "../graphql-api/get-recipes-for-client";
import { AssistantRecipe, Language } from "../graphql-api/types";
import { useRecipeCallback } from "../graphql-api/use-recipe";
import { getDependencies } from "../utils/dependencies/get-dependencies";
import { getLanguageForDocument } from "../utils/fileUtils";
import {
  addRecipeToEditor,
  deleteInsertedCode,
  insertSnippet,
  LatestRecipeHolder,
  resetRecipeHolder,
} from "../utils/snippetUtils";
import { getUser } from "../graphql-api/user";
import { LANGUAGE_ENUMATION_TO_STRING } from "../utils/languageUtils";
import { favoriteSnippet, unfavoriteSnippet } from "../graphql-api/favorite";
import {
  snippetVisibilityOnlyPrivate,
  snippetVisibilityOnlyPublic,
  snippetVisibilityOnlySubscribed,
} from "../graphql-api/configuration";

let panel: vscode.WebviewPanel | undefined = undefined;
let lastActiveTextEditor: vscode.TextEditor | undefined = undefined;
const latestRecipeHolder: LatestRecipeHolder = {
  recipe: undefined,
  insertedRange: undefined,
};

interface MessageFromWebview {
  command: string;
  term: string | undefined;
  snippet: AssistantRecipe | undefined;
  onlyPublic: boolean | undefined;
  onlyPrivate: boolean | undefined;
  onlySubscribed: boolean | undefined;
}

export const recordLastEditor = (): void => {
  const currentEditor = vscode.window.activeTextEditor;
  const currentDocument = currentEditor?.document;

  if (currentDocument) {
    lastActiveTextEditor = currentEditor;
  }
};

export async function showCodigaWebview(
  context: vscode.ExtensionContext
): Promise<void> {
  if (panel) {
    panel.reveal(vscode.ViewColumn.Beside);
  } else {
    panel = vscode.window.createWebviewPanel(
      "codiga",
      "Codiga",
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(context.extensionPath, "client", "src", "webview")),
          vscode.Uri.file(path.join(context.extensionPath, "client", "webview")),
        ],
      }
    );

    const faviconUri = vscode.Uri.file(
      path.join(context.extensionPath, "images", "favicon.svg")
    );
    panel.iconPath = {
      dark: faviconUri,
      light: faviconUri,
    };

    const webviewContent = await getWebviewContent(
      panel.webview,
      context.extensionPath
    );

    panel.webview.html = webviewContent;

    // Set up message receicing from the webview
    panel.webview.onDidReceiveMessage(async (message) => {
      await handleMessage(message);
    });

    // if the view closes, remove the panel.
    panel.onDidDispose(() => {
      panel = undefined;
    });
  }
}

const handleMessage = async (message: MessageFromWebview): Promise<void> => {
  if (message.command === "getUser") {
    const user = await getUser();

    if (panel) {
      await panel.webview.postMessage({
        command: "user",
        user: user,
      });
    }

    return;
  }

  if (message.command === "setup") {
    if (panel) {
      await panel.webview.postMessage({
        command: "setup",
        onlyPublic: snippetVisibilityOnlyPublic(),
        onlyPrivate: snippetVisibilityOnlyPrivate(),
        onlySubscribed: snippetVisibilityOnlySubscribed(),
      });
    }

    return;
  }
  if (message.command === "search") {
    const searchTerm = message.term?.length === 0 ? undefined : message.term;
    const onlyPublic = message.onlyPublic;
    const onlyPrivate = message.onlyPrivate;
    const onlySubscribed = message.onlySubscribed;

    await updateWebview(searchTerm, onlyPublic, onlyPrivate, onlySubscribed);
    return;
  }
  if (message.command === "favoriteSnippet") {
    const searchTerm = message.term?.length === 0 ? undefined : message.term;
    const onlyPublic = message.onlyPublic;
    const onlyPrivate = message.onlyPrivate;
    const onlySubscribed = message.onlySubscribed;

    if (message.snippet) {
      const favoriteResult = await favoriteSnippet(message.snippet);
      if (!favoriteResult) {
        vscode.window.showInformationMessage(
          "Error, make sure you put your Codiga API keys in your preferences."
        );
      }
    }

    await updateWebview(searchTerm, onlyPublic, onlyPrivate, onlySubscribed);
    return;
  }
  if (message.command === "unfavoriteSnippet") {
    const searchTerm = message.term?.length === 0 ? undefined : message.term;
    const onlyPublic = message.onlyPublic;
    const onlyPrivate = message.onlyPrivate;
    const onlySubscribed = message.onlySubscribed;

    if (message.snippet) {
      const result = await unfavoriteSnippet(message.snippet);
      if (!result) {
        vscode.window.showInformationMessage(
          "Error, make sure you put your Codiga API keys in your preferences."
        );
      }
    }

    await updateWebview(searchTerm, onlyPublic, onlyPrivate, onlySubscribed);
    return;
  }
  if (message.command === "insertSnippet") {
    if (lastActiveTextEditor && message.snippet) {
      await deleteInsertedCode(
        lastActiveTextEditor,
        latestRecipeHolder.insertedRange
      );
      resetRecipeHolder(latestRecipeHolder);
      const language = getLanguageForDocument(lastActiveTextEditor.document);
      await insertSnippet(
        lastActiveTextEditor,
        lastActiveTextEditor.selection.active,
        message.snippet,
        language
      );
      await useRecipeCallback(message.snippet.id);
    }
  }
  if (message.command === "addPreviewSnippet") {
    if (lastActiveTextEditor && message.snippet) {
      await deleteInsertedCode(
        lastActiveTextEditor,
        latestRecipeHolder.insertedRange
      );
      resetRecipeHolder(latestRecipeHolder);
      await addRecipeToEditor(
        lastActiveTextEditor,
        lastActiveTextEditor.selection.active,
        message.snippet,
        latestRecipeHolder
      );
    }
  }
  if (message.command === "removePreviewSnippet") {
    if (lastActiveTextEditor) {
      await deleteInsertedCode(
        lastActiveTextEditor,
        latestRecipeHolder.insertedRange
      );
      resetRecipeHolder(latestRecipeHolder);
    }
  }
  return;
};

export const updateWebview = async (
  term: string | undefined = undefined,
  onlyPublic: boolean | undefined = undefined,
  onlyPrivate: boolean | undefined = undefined,
  onlySubscribed: boolean | undefined = undefined
): Promise<void> => {
  const editor = lastActiveTextEditor || vscode.window.activeTextEditor;

  if (!editor) {
    console.debug("no editor");
    if (panel) {
      await panel.webview.postMessage({
        command: "pageChanged",
        language: null,
        languageString: null,
        snippets: [],
        resetSearch: true,
      });
      return;
    } else {
      console.debug("no editor and no panel");
      return;
    }
  }
  const document = editor.document;

  if (!document && panel) {
    console.debug("no document");
    await panel.webview.postMessage({
      command: "pageChanged",
      language: null,
      languageString: null,
      snippets: [],
      resetSearch: true,
    });
    return;
  }
  const path = document.uri.path;

  const dependencies: string[] = await getDependencies(document);
  const relativePath = vscode.workspace.asRelativePath(path);
  const language: Language = getLanguageForDocument(document);

  if (panel && language === Language.Unknown) {
    await panel.webview.postMessage({
      command: "pageChanged",
      language: null,
      languageString: null,
      snippets: [],
      resetSearch: true,
    });
    return;
  }

  const snippets = await getRecipesForClient(
    term,
    relativePath,
    language,
    dependencies,
    onlyPublic,
    onlyPrivate,
    onlySubscribed
  );

  if (panel) {
    /**
     * if we do not have a search term, reset it on the page.
     */
    const resetSearch = !term || term?.length === 0;

    await panel.webview.postMessage({
      command: "pageChanged",
      language: language,
      languageString: LANGUAGE_ENUMATION_TO_STRING[language],
      snippets: snippets,
      resetSearch: resetSearch,
    });
  } else {
    // console.debug("no panel");
  }
};

function getNonce() {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

const getWebviewContent = (
  webview: vscode.Webview,
  extensionPath: string
): string => {
  const reactAppPathOnDisk = vscode.Uri.file(
    path.join(extensionPath, "webview", "webview.js")
  );
  const scriptUri = webview.asWebviewUri(reactAppPathOnDisk);
  const nonce = getNonce();

  return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Codiga</title>   
        <meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src ${webview.cspSource}; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}' 'self' 'unsafe-eval';">
        <script>
          window.acquireVsCodeApi = acquireVsCodeApi;
        </script>
    </head>
    <body>
        <div id="root"></div>
        <script nonce="${nonce}" src="${scriptUri}"></script>
    </body>
    </html>`;
};
