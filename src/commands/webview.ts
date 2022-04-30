import * as vscode from "vscode";
import * as path from "path";

import { getRecipesForClient } from "../graphql-api/get-recipes-for-client";
import { AssistantRecipe, Language, User } from "../graphql-api/types";
import { useRecipeCallback } from "../graphql-api/use-recipe";
import { getDependencies } from "../utils/dependencies/get-dependencies";
import { getLanguageForDocument } from "../utils/fileUtils";
import { LANGUAGE_ENUMATION_TO_STRING } from "../utils/languageUtils";
import {
  addRecipeToEditor,
  deleteInsertedCode,
  insertSnippet,
  LatestRecipeHolder,
  resetRecipeHolder,
} from "../utils/snippetUtils";
import { getUser } from "../graphql-api/user";

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
  const columnToShowIn = vscode.window.activeTextEditor
    ? vscode.window.activeTextEditor.viewColumn
    : undefined;

  if (panel) {
    panel.reveal(vscode.ViewColumn.Beside);
  } else {
    const currentUser = await getUser();

    panel = vscode.window.createWebviewPanel(
      "codiga",
      "Codiga",
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(context.extensionPath, "src", "webview")),
          vscode.Uri.file(path.join(context.extensionPath, "webview")),
        ],
      }
    );

    const faviconUri = vscode.Uri.file(
      path.join(context.extensionPath, "src", "webview", "favicon.svg")
    );
    panel.iconPath = {
      dark: faviconUri,
      light: faviconUri,
    };

    const user = await getUser();

    panel.webview.html = getWebviewContent(context.extensionPath);

    // Set up message receicing from the webview
    panel.webview.onDidReceiveMessage(async (message) => {
      await handleMessage(message);
    });

    // if the view closes, remove the panel.
    panel.onDidDispose(() => {
      panel = undefined;
    });

    // update the webview
    await updateWebview();

    panel.webview.postMessage({
      command: "user",
      user: user,
    });
  }
}

const handleMessage = async (message: MessageFromWebview): Promise<void> => {
  if (message.command === "search") {
    const searchTerm = message.term?.length === 0 ? undefined : message.term;
    const onlyPublic = message.onlyPublic;
    const onlyPrivate = message.onlyPrivate;
    const onlySubscribed = message.onlySubscribed;

    updateWebview(searchTerm, onlyPublic, onlyPrivate, onlySubscribed);
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
  const editor = lastActiveTextEditor;
  if (!editor) {
    return;
  }
  const document = editor.document;

  if (!document) {
    return;
  }
  const path = document.uri.path;

  const dependencies: string[] = await getDependencies(document);
  const relativePath = vscode.workspace.asRelativePath(path);
  const language: Language = getLanguageForDocument(document);

  if (panel && language === Language.Unknown) {
    panel.webview.postMessage({
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

    panel.webview.postMessage({
      command: "pageChanged",
      language: language,
      languageString: LANGUAGE_ENUMATION_TO_STRING[language],
      snippets: snippets,
      resetSearch: resetSearch,
    });
  }
};

const getWebviewContent = (extensionPath: string): string => {
  const reactAppPathOnDisk = vscode.Uri.file(
    path.join(extensionPath, "webview", "webview.js")
  );
  const reactAppUri = reactAppPathOnDisk.with({ scheme: "vscode-resource" });

  return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Codiga</title>
        <meta http-equiv="Content-Security-Policy"
                    content="default-src 'none';
                             img-src https:;
                             script-src 'unsafe-eval' 'unsafe-inline' vscode-resource:;
                             style-src vscode-resource: 'unsafe-inline';">
        <script>
          window.acquireVsCodeApi = acquireVsCodeApi;
        </script>
    </head>
    <body>
        <div id="root"></div>
        <script src="${reactAppUri}"></script>
    </body>
    </html>`;
};
