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
  console.log("record new editor");

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
          vscode.Uri.file(
            path.join(context.extensionPath, "src", "webview", "highlightjs")
          ),
        ],
      }
    );

    const user = await getUser();

    panel.webview.html = getWebviewContent(user);

    // Get path to resource on disk
    // const showdownJsUri = panel.webview.asWebviewUri(
    //   vscode.Uri.file(
    //     path.join(context.extensionPath, "src", "webview", "showdown.min.js")
    //   )
    // );

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
  }
}

const handleMessage = async (message: MessageFromWebview): Promise<void> => {
  console.log(`received ${message}`);
  if (message.command === "search") {
    const searchTerm = message.term?.length === 0 ? undefined : message.term;
    const onlyPublic = message.onlyPublic;
    const onlyPrivate = message.onlyPrivate;
    const onlySubscribed = message.onlySubscribed;
    console.log(onlyPublic);
    console.log(onlyPrivate);
    console.log(onlySubscribed);

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

  console.log(snippets.length);

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

const getWebviewContent = (user: User | undefined): string => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Codiga</title>
</head>
<body>
    <h1 id="language">Codiga Loading</h1>

    ${
      user
        ? '<div>Logged as: <a href="https://app.codiga.io">' +
          user.username +
          "</a></div>"
        : '<div>not authenticated, <a href="https://app.codiga.io/account/auth/vscode">click here to authenticate</a></div>'
    }
    <form id="form">
      <input type="text" id="search" />
      <input type="submit" id="submit" />

      <br>
      <input type="radio" id="snippetsPublicAndPrivate" name="snippetsPrivacy" value="publicPrivate" checked onchange="refreshPage();">
      <label for="snippetsPublicAndPrivate">Show Public And Private Snippets</label><br>
      <input type="radio" id="snippetsPublic" name="snippetsPrivacy" value="public" onchange="refreshPage();">
      <label for="snippetsPublic">Public Snippets Only</label><br>
      <input type="radio" id="snippetsPrivate" name="snippetsPrivacy" value="private" onchange="refreshPage();">
      <label for="snippetsPrivate">Private Snippets only (created by me and shared with groups)</label>
      <br>
      <input type="checkbox" id="checkboxOnlySubscribed" name="onlySubscribed" value="true" onchange="refreshPage();">
      <label for="checkboxOnlySubscribed">Subscribed Snippets Only</label>
    </form>

    <div id="snippets">
      loading
    </div>



    <script>
        const userSection = document.getElementById('user');
        const languageDiv = document.getElementById('language');
        const form = document.getElementById('form');
        const search = document.getElementById('search');
        const snippetsSection = document.getElementById('snippets');
        const vscode = acquireVsCodeApi();
        const submitButton = document.getElementById('submit');
        const checkboxOnlySubscribed = document.getElementById('checkboxOnlySubscribed');
        const snippetsPublicAndPrivate = document.getElementById('snippetsPublicAndPrivate');
        const snippetsPublic = document.getElementById('snippetsPublic');
        const snippetsPrivate = document.getElementById('snippetsPrivate');



        const activateSearch= (enabled) => {
          submitButton.disabled = !enabled;
          snippetsPrivate.disabled = !enabled;
          snippetsPublic.disabled = !enabled;
          snippetsPublicAndPrivate.disabled = !enabled;
          checkboxOnlySubscribed.disabled = !enabled;
          form.hidden = !enabled;
        };

        const refreshPage = () => {
          const onlyPublicCheckBoxValue = snippetsPublic.checked === true ? true : undefined;
          const onlyPrivateCheckBoxValue = snippetsPrivate.checked === true ? true : undefined;
          const onlySubscribedCheckboxValue = checkboxOnlySubscribed.checked;
          
          console.log(onlyPublicCheckBoxValue);
          console.log(onlyPrivateCheckBoxValue);

          vscode.postMessage({
            command: 'search',
            term: search.value,
            onlyPublic: onlyPublicCheckBoxValue,
            onlyPrivate: onlyPrivateCheckBoxValue,
            onlySubscribed: onlySubscribedCheckboxValue
          }); 
        };

        form.onsubmit = (e) => {
          e.preventDefault();
          refreshPage();
        };

        const insertSnippet = (snippetBase64) => {
          const snippet = atob(snippetBase64);
          vscode.postMessage({
            command: 'insertSnippet',
            snippet: JSON.parse(snippet)
          }); 
        };

        const addPreviewSnippet = (snippetBase64) => {
          const snippet = JSON.parse(atob(snippetBase64));
          const buttonId = "button-" + snippet.id;
          const button = document.getElementById(buttonId);
          button.innerText = "Insert Snippet";
          vscode.postMessage({
            command: 'addPreviewSnippet',
            snippet: snippet
          }); 
        };

        const removePreviewSnippet = (snippetBase64) => {
          const snippet = JSON.parse(atob(snippetBase64));
          const buttonId = "button-" + snippet.id;
          const button = document.getElementById(buttonId);
          button.innerText = "Preview Snippet";
          vscode.postMessage({
            command: 'removePreviewSnippet',
            snippet: snippet
          }); 
        };

        const showSnippets = (snippets) => {
          let newContent = '';
          if (!snippets || snippets.length === 0){
            snippetsSection.innerHTML = "<div>No Snippet found</div>";
            return;
          }
          snippets.forEach((s)=> {
            const decodedSnippet = atob(s.presentableFormat).replaceAll('\\n', '<br>').replaceAll(' ', '&nbsp;');
            const descriptionMarkdown = s.description;
            const buttonId = "button-" + s.id;


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
              <button type=\\"button\\" id=\\""+buttonId+"\\"\
                      onclick=\\"insertSnippet(\\'"+snippetStringToBase64+"\\');\\"\
                      // onmouseenter=\\"addPreviewSnippet(\\'"+snippetStringToBase64+"\\');\\"\
                      // onmouseout=\\"removePreviewSnippet(\\'"+snippetStringToBase64+"\\');\\"\
              >Preview Snippet</button> \
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
                    if(message.languageString === null) {
                      languageDiv.textContent = "Language not supported";
                      snippetsSection.innerHTML = "Codiga does not support this language at this time.";
                      activateSearch(false);
                      break;
                    }

                    languageDiv.textContent = message.languageString;
                    if(message.resetSearch && message.resetSearch === true) {
                      search.value = '';
                    }
                    showSnippets(message.snippets);
                    activateSearch(true);
                    break;
            }
        });
    </script>

</body>
</html>
  `;
};
