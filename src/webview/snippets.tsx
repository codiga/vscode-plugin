import * as React from "react";
import { useState } from "react";
import {
  VSCodeButton,
  VSCodeProgressRing,
  VSCodeLink,
} from "@vscode/webview-ui-toolkit/react";

import { AssistantRecipe, Language } from "../graphql-api/types";

interface SnippetsProps {
  vsCodeApi: any;
  snippets: AssistantRecipe[];
  language: Language;
  loading: boolean;
  initialLoading: boolean;
}

export const Snippets = (props: SnippetsProps) => {
  if (props.initialLoading === true) {
    return <div></div>;
  }
  if (props.loading === true) {
    return (
      <div
        style={{
          padding: "2em",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <VSCodeProgressRing />
      </div>
    );
  }

  const body = document.getElementsByTagName("body")[0];
  const vsCodeThemeKind = body.getAttribute("data-vscode-theme-kind");

  const getSnippetBackgroundColor = (themeKind: string): string => {
    if (themeKind === "vscode-dark") {
      return "rgba(255, 255, 255, 0.05)";
    }
    if (themeKind === "vscode-light") {
      return " rgba(0, 0, 0, 0.05)";
    }
    if (themeKind === "vscode-high-contrast") {
      return "none";
    }
    return "none";
  };

  const getCodeBackgroundColor = (themeKind: string): string => {
    if (themeKind === "vscode-dark") {
      return "rgba(255, 255, 255, 0.05)";
    }
    if (themeKind === "vscode-light") {
      return " rgba(0, 0, 0, 0.05)";
    }
    if (themeKind === "vscode-high-contrast") {
      return "none";
    }
    return "none";
  };

  const snippetBackgroundColor = getSnippetBackgroundColor(vsCodeThemeKind);
  const codeBackgroundColor = getCodeBackgroundColor(vsCodeThemeKind);

  if (props.language === Language.Unknown) {
    return (
      <div>{`This language is not support by Codiga. Select a window with a supported language.`}</div>
    );
  }

  if (props.snippets.length === 0) {
    return <div>No snippets</div>;
  }

  const insertSnippet = (snippet: AssistantRecipe) => {
    props.vsCodeApi.postMessage({
      command: "insertSnippet",
      snippet: snippet,
    });
  };

  const addPreviewSnippet = (snippet: AssistantRecipe) => {
    props.vsCodeApi.postMessage({
      command: "addPreviewSnippet",
      snippet: snippet,
    });
  };

  const deletePreviewSnippet = (snippet: AssistantRecipe) => {
    props.vsCodeApi.postMessage({
      command: "removePreviewSnippet",
      snippet: snippet,
    });
  };

  const SnippetButton = (props: { snippet: AssistantRecipe }) => {
    const [buttonText, setButtonText] = useState<string>("Preview");
    return (
      <VSCodeButton
        style={{ minWidth: "10em" }}
        type="button"
        onClick={(e) => {
          e.preventDefault;
          insertSnippet(props.snippet);
        }}
        onMouseOver={(e) => {
          e.preventDefault;
          addPreviewSnippet(props.snippet);
          setButtonText("Insert");
        }}
        onMouseOut={(e) => {
          e.preventDefault;
          deletePreviewSnippet(props.snippet);
          setButtonText("Preview");
        }}
      >
        {buttonText}
      </VSCodeButton>
    );
  };

  return (
    <>
      {props.snippets.map((snippet) => (
        <div
          key={`snippet-${snippet.id}`}
          style={{
            backgroundColor: `${snippetBackgroundColor}`,
            paddingTop: "0.2em",
            paddingBottom: "0.2em",
            paddingLeft: "1em",
            paddingRight: "1em",
            marginBottom: "1em",
          }}
        >
          <div
            style={{
              float: "right",
              marginTop: "1em",
            }}
          >
            <SnippetButton snippet={snippet} />
          </div>
          <h2>{snippet.name}</h2>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              flexWrap: "wrap",
              alignItems: "left",
              gap: "1em 1em",
            }}
          >
            {snippet.owner && snippet.owner.username && (
              <p
                style={{
                  fontSize: "0.9em",
                  fontWeight: "bold",
                }}
              >
                Owner:{" "}
                <a
                  href={`https://app.codiga.io/hub/user/${snippet.owner.accountType.toLowerCase()}/${
                    snippet.owner.username
                  }`}
                >
                  {snippet.owner.username}
                </a>
              </p>
            )}
            {snippet.groups && snippet.groups.length > 0 && (
              <p
                style={{
                  fontSize: "0.9em",
                  fontWeight: "bold",
                }}
              >
                Groups:{" "}
                {snippet.groups.map((group) => (
                  <a
                    href={`https://app.codiga.io/assistant/group-sharing/recipes?group=${group.name}`}
                  >
                    {group.name}
                  </a>
                ))}
              </p>
            )}
            {snippet.isPublic === true && (
              <p
                style={{
                  fontSize: "0.9em",
                  fontWeight: "bold",
                }}
              >
                Public
              </p>
            )}
            {snippet.isPublic === false && (
              <p
                style={{
                  fontSize: "0.9em",
                  fontWeight: "bold",
                }}
              >
                Private
              </p>
            )}{" "}
            {snippet.shortcut && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  marginLeft: "auto",
                }}
              >
                <p
                  style={{
                    fontSize: "0.9em",
                    fontWeight: "bold",
                  }}
                >
                  Shortcut:&nbsp;
                </p>
                <pre
                  style={{
                    fontSize: "0.9em",
                  }}
                >
                  {snippet.shortcut}
                </pre>
              </div>
            )}
          </div>

          <pre
            style={{
              backgroundColor: `${codeBackgroundColor}`,
              margin: 0,
              paddingTop: "0.5em",
              paddingBottom: "0.5em",
              paddingLeft: "1em",
              paddingRight: "1em",
            }}
          >
            <code>{atob(snippet.presentableFormat)}</code>
          </pre>
          <div
            style={{
              textAlign: "right",
            }}
          >
            {snippet.isPublic === true && (
              <VSCodeLink
                href={`https://app.codiga.io/hub/recipe/${snippet.id}/view`}
              >
                Learn More
              </VSCodeLink>
            )}
            {snippet.isPublic === false && (
              <VSCodeLink
                href={`https://app.codiga.io/assistant/recipe/${snippet.id}/view`}
              >
                Learn More
              </VSCodeLink>
            )}
          </div>
        </div>
      ))}
    </>
  );
};
