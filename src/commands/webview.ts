import * as vscode from "vscode";
import { getRecipesForClient } from "../graphql-api/get-recipes-for-client";
import { Language } from "../graphql-api/types";
import { getDependencies } from "../utils/dependencies/get-dependencies";
import { getLanguageForDocument } from "../utils/fileUtils";
import { LANGUAGE_ENUMATION_TO_STRING } from "../utils/languageUtils";

let panel: vscode.WebviewPanel | undefined = undefined;

interface MessageFromWebview {
  command: string;
  term: string | undefined;
}

export async function showCodigaWebview(): Promise<void> {
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
      }
    );

    panel.webview.onDidReceiveMessage((message) => {
      handleMessage(message);
    });

    panel.webview.html = getWebviewContent();

    panel.onDidDispose(() => {
      panel = undefined;
    });

    updateWebview();
  }
}

const handleMessage = (message: MessageFromWebview) => {
  console.log(`received ${message}`);
  console.log(message.term);
};

export const updateWebview = async (): Promise<void> => {
  const editor = vscode.window.activeTextEditor;
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
    undefined,
    relativePath,
    language,
    dependencies
  );

  if (panel) {
    panel.webview.postMessage({
      command: "pageChanged",
      language: language,
      languageString: LANGUAGE_ENUMATION_TO_STRING[language],
      snippets: snippets,
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

        const showSnippets = (snippets) => {
          let newContent = '';
          if (!snippets){
            return;
          }
          snippets.forEach((s)=> {
            const decodedSnippet = atob(s.presentableFormat).replaceAll('\\n', '<br>');
            newContent = newContent + "<div class=snippet><h3>" + s.name + "</h3><p>"+ s.description+"</p><code>"+decodedSnippet+"</code></div>";
            console.log(s);
          })
          snippetsSection.innerHTML = newContent;
        };


        // Handle the message inside the webview
        window.addEventListener('message', event => {

            const message = event.data; // The JSON data our extension sent

            switch (message.command) {
                case 'pageChanged':
                    languageDiv.textContent = message.languageString;
                    showSnippets(message.snippets);
                    break;
            }
        });
    </script>
</body>
</html>
  `;
};
