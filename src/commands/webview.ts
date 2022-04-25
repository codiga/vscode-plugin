import * as vscode from "vscode";
import * as path from "path";

import { getRecipesForClient } from "../graphql-api/get-recipes-for-client";
import { AssistantRecipe, Language } from "../graphql-api/types";
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

let panel: vscode.WebviewPanel | undefined = undefined;
let lastActiveTextEditor: vscode.TextEditor | undefined = undefined;
let lastPosition: vscode.Position | undefined = undefined;
const latestRecipeHolder: LatestRecipeHolder = {
  recipe: undefined,
  insertedRange: undefined,
};

interface MessageFromWebview {
  command: string;
  term: string | undefined;
  snippet: AssistantRecipe | undefined;
}

export const recordLastEditor = (): void => {
  const currentEditor = vscode.window.activeTextEditor;
  const currentDocument = currentEditor?.document;

  if (currentDocument) {
    const language = getLanguageForDocument(currentDocument);
    if (language !== Language.Unknown) {
      lastActiveTextEditor = currentEditor;
      lastPosition = currentEditor.selection.active;
    }
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
    panel = vscode.window.createWebviewPanel(
      "codiga",
      "Codiga",
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(context.extensionPath, "src", "webview")),
          vscode.Uri.file(
            path.join(context.extensionPath, "src", "webview", "highlightjs")
          ),
        ],
      }
    );

    // Get path to resource on disk
    // const showdownJsUri = panel.webview.asWebviewUri(
    //   vscode.Uri.file(
    //     path.join(context.extensionPath, "src", "webview", "showdown.min.js")
    //   )
    // );

    panel.webview.onDidReceiveMessage(async (message) => {
      await handleMessage(message);
    });

    panel.webview.html = getWebviewContent();

    panel.onDidDispose(() => {
      panel = undefined;
    });

    await updateWebview();
  }
}

const handleMessage = async (message: MessageFromWebview): Promise<void> => {
  console.log(`received ${message}`);
  if (message.command === "search") {
    const searchTerm = message.term?.length === 0 ? undefined : message.term;
    updateWebview(searchTerm);
    return;
  }
  if (message.command === "insertSnippet") {
    if (lastActiveTextEditor && lastPosition && message.snippet) {
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
  term: string | undefined = undefined
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

  const snippets = await getRecipesForClient(
    term,
    relativePath,
    language,
    dependencies
  );

  if (panel) {
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

const getWebviewContent = (): string => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Codiga</title>
</head>
<body>
    <h1 id="language"></h1>

    <form id="form">
      <input type="text" id="search" />
      <input type="submit" id="submit" />
    </form>

    <div id="snippets">

    </div>



    <script>
        const languageDiv = document.getElementById('language');
        const form = document.getElementById('form');
        const search = document.getElementById('search');
        const snippetsSection = document.getElementById('snippets');
        const vscode = acquireVsCodeApi();
        form.onsubmit = (e) => {
          e.preventDefault();
          vscode.postMessage({
            command: 'search',
            term: search.value
          }); 
        };

        const insertSnippet = (snippetBase64) => {
          const snippet = atob(snippetBase64);
          vscode.postMessage({
            command: 'insertSnippet',
            snippet: JSON.parse(snippet)
          }); 
        };

        const addPreviewSnippet = (snippetBase64) => {
          const snippet = atob(snippetBase64);
          vscode.postMessage({
            command: 'addPreviewSnippet',
            snippet: JSON.parse(snippet)
          }); 
        };

        const removePreviewSnippet = (snippetBase64) => {
          const snippet = atob(snippetBase64);
          vscode.postMessage({
            command: 'removePreviewSnippet',
            snippet: JSON.parse(snippet)
          }); 
        };

        const showSnippets = (snippets) => {
          let newContent = '';
          if (!snippets){
            return;
          }
          snippets.forEach((s)=> {
            const decodedSnippet = atob(s.presentableFormat).replaceAll('\\n', '<br>').replaceAll(' ', '&nbsp;');
            const descriptionMarkdown = s.description;


            const snippetStringified = JSON.stringify(s);
            const snippetStringToBase64 = btoa(snippetStringified);
            const vscodeFormat = s.vscodeFormat;
            newContent = newContent + "<div>\
              <h3>" + s.name + "</h3>";
            if(s.isPublic === true) {
              newContent = newContent + "Public";
            }
            if(s.isPublic === false) {
              newContent = newContent + "Private";
            }

            if(s.owner && s.owner.username && s.owner.accountType) {
              newContent = newContent + "<a href=\\"https://app.codiga.io/hub/user/"+s.owner.accountType.toLowerCase()+"/"+s.owner.username+"\\">"+s.owner.username+"</a>";
            }

            if(s.groups && s.groups.length > 0) {
              newContent = newContent + "Groups: "
              newContent = newContent + "<a href=\\"https://app.codiga.io/assistant/group-sharing/recipes\\">"+s.groups.map(g => g.name).join(", ")+"</a>";
            }


            if(s.shortcut) {
              newContent = newContent + "Shortcut: " + s.shortcut;
            }
            if(s.isPublic) {
              newContent = newContent + "<a href=\\"https://app.codiga.io/hub/recipe/"+s.id+"/view\\">See on Codiga</a>";
            }
            if(!s.isPublic) {
              newContent = newContent + "<a href=\\"https://app.codiga.io/assistant/recipe/"+s.id+"/view\\">See on Codiga</a>";
            }
            newContent = newContent + "\
              <button type=\\"button\\" \
                      onclick=\\"insertSnippet(\\'"+snippetStringToBase64+"\\');\\"\
                      onmouseenter=\\"addPreviewSnippet(\\'"+snippetStringToBase64+"\\');\\"\
                      onmouseout=\\"removePreviewSnippet(\\'"+snippetStringToBase64+"\\');\\"\
              >Insert Snippet</button> \
              <div>"+descriptionMarkdown+"</div>\
              <pre><code>"+decodedSnippet+"</code></pre> \
            </div>";
          })
          snippetsSection.innerHTML = newContent;
        };


        // Handle the message inside the webview
        window.addEventListener('message', event => {
            const message = event.data; // The JSON data our extension sent

            switch (message.command) {
                case 'pageChanged':
                    languageDiv.textContent = message.languageString;
                    if(message.resetSearch && message.resetSearch === true) {
                      search.value = '';
                    }
                    showSnippets(message.snippets);
                    break;
            }
        });
    </script>

</body>
</html>
  `;
};
