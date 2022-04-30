import * as React from "react";
import { useState } from "react";

import { AssistantRecipe, Language } from "../graphql-api/types";

interface SnippetsProps {
  vsCodeApi: any;
  snippets: AssistantRecipe[];
  language: Language;
  loading: boolean;
}

export const Snippets = (props: SnippetsProps) => {
  if (props.loading === true) {
    return <div>Loading</div>;
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
      <button
        style={{ width: "5em" }}
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
      </button>
    );
  };

  return (
    <>
      {props.snippets.map((snippet) => (
        <div key={`snippet-${snippet.id}`}>
          <h3>{snippet.name}</h3>
          {snippet.isPublic === true && <p>Public</p>}
          {snippet.isPublic === false && <p>Private</p>}

          {snippet.shortcut && <pre>{snippet.shortcut}</pre>}

          {snippet.isPublic === true && (
            <a href={`https://app.codiga.io/hub/recipe/${snippet.id}/view`}>
              See on Codiga
            </a>
          )}
          {snippet.isPublic === false && (
            <a
              href={`https://app.codiga.io/assistant/recipe/${snippet.id}/view`}
            >
              See on Codiga
            </a>
          )}
          <SnippetButton snippet={snippet} />

          <pre>
            <code>{atob(snippet.presentableFormat)}</code>
          </pre>
        </div>
      ))}
    </>
  );
};
