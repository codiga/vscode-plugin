import * as React from "react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  VSCodeButton,
  VSCodeProgressRing,
  VSCodeLink,
} from "@vscode/webview-ui-toolkit/react";

import { AssistantRecipe, Language, User } from "../graphql-api/types";
import { HeartFilledIcon, HeartIcon } from "./icons/heartIcon";
import { LockClosed, LockOpen } from "./icons/lock";

interface SnippetsProps {
  vsCodeApi: any;
  snippets: AssistantRecipe[];
  language: Language;
  loading: boolean;
  initialLoading: boolean;
  user: User | undefined;
  searchPublic: boolean;
  searchPrivate: boolean;
  searchSubscribedOnly: boolean;
  term: string;
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

  const getIconColor = (themeKind: string): string => {
    if (themeKind === "vscode-dark") {
      return " #CCCCCC";
    }
    if (themeKind === "vscode-light") {
      return "#404040";
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
  const iconColor = getIconColor(vsCodeThemeKind);

  if (props.language === Language.Unknown) {
    return (
      <div>{`This language is not support by Codiga. Select a window with a supported language.`}</div>
    );
  }

  if (props.snippets.length === 0) {
    return <div>No snippets</div>;
  }

  const favoriteSnippet = (snippet: AssistantRecipe) => {
    props.vsCodeApi.postMessage({
      command: "favoriteSnippet",
      snippet: snippet,
      term: props.term,
      searchPublic: props.searchPublic,
      searchPrivate: props.searchPrivate,
      searchSubscribedOnly: props.searchSubscribedOnly,
    });
  };

  const unFavoriteSnippet = (snippet: AssistantRecipe) => {
    props.vsCodeApi.postMessage({
      command: "unfavoriteSnippet",
      snippet: snippet,
      term: props.term,
      searchPublic: props.searchPublic,
      searchPrivate: props.searchPrivate,
      searchSubscribedOnly: props.searchSubscribedOnly,
    });
  };

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
              display: "flex",
              alignItems: "left",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "left",
                flexDirection: "row",
              }}
            >
              <h2
                // style={{ display: "inline-block", verticalAlign: "middle" }}
              >
                {snippet.name}{" "}
              </h2>{" "}
              {snippet.isPublic === true && (
                <div
                  style={{
                    alignItems: "center",
                    display: "flex",
                    justifyContent: "center",
                    marginLeft: "10px",
                  }}
                  title="Public Snippet"
                >
                  <LockOpen width={15} height={15} color={iconColor} />
                </div>
              )}
              {snippet.isPublic === false && (
                <div
                  style={{
                    alignItems: "center",
                    display: "flex",
                    justifyContent: "center",
                    marginLeft: "10px",
                  }}
                  title="Private Snippet"
                >
                  <LockClosed width={15} height={15} color={iconColor} />
                </div>
              )}{" "}
              {props.user && snippet.isSubscribed === true && (
                <>
                  <div
                    style={{
                      alignItems: "center",
                      display: "flex",
                      justifyContent: "center",
                      marginLeft: "10px",
                    }}
                    title="Favorite Snippet"
                    onClick={(e) => {
                      e.preventDefault;
                      unFavoriteSnippet(snippet);
                    }}
                  >
                    <HeartFilledIcon width={15} height={15} />
                  </div>
                </>
              )}
              {snippet.isSubscribed === false && (
                <>
                  <div
                    style={{
                      alignItems: "center",
                      display: "flex",
                      justifyContent: "center",
                      marginLeft: "10px",
                    }}
                    onClick={(e) => {
                      e.preventDefault;
                      favoriteSnippet(snippet);
                    }}
                    title="Not a favorite Snippet"
                  >
                    <HeartIcon width={15} height={15} />
                  </div>
                </>
              )}
            </div>
            <div
              style={{
                display: "flex",
                marginLeft: "auto",
              }}
            >
              <div
                style={{
                  paddingTop: "1.2em",
                  paddingRight: "0em",
                }}
              >
                <SnippetButton snippet={snippet} />
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "row",
              flexWrap: "wrap",
              alignItems: "left",
              gap: "1em 1em",
            }}
          >
            {snippet.owner && snippet.owner.displayName && (
              <p
                style={{
                  fontSize: "0.9em",
                  fontWeight: "bold",
                }}
              >
                Owner:{" "}
                {snippet.owner.hasSlug && snippet.owner.slug !== undefined && (
                  <a
                    href={`https://app.codiga.io/hub/user/${snippet.owner.slug}`}
                  >
                    {snippet.owner.displayName}
                  </a>
                )}
                {!snippet.owner.hasSlug && <>{snippet.owner.displayName}</>}
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
            )}{" "}
            {snippet.cookbook && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  flexWrap: "wrap",
                  alignItems: "left",
                  gap: "1em 1em",
                }}
              >
                <p
                  style={{
                    fontSize: "0.9em",
                    fontWeight: "bold",
                  }}
                >
                  Cookbook:{" "}
                  <a
                    href={`https://app.codiga.io/hub/cookbook/${snippet.cookbook.id}/cookbook`}
                  >
                    {snippet.cookbook.name}
                  </a>
                </p>
              </div>
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
              overflow: "auto",
            }}
          >
            <code>{atob(snippet.presentableFormat)}</code>
          </pre>

          <div>
            <ReactMarkdown
              components={{
                h1: "h3",
                h2: "h4",
                h3: "h5",
                h4: "h6",
              }}
              children={snippet.description}
            />
          </div>
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