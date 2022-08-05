import * as React from "react";
import { Language, User } from "../graphql-api/types";
import {
  VSCodeTextField,
  VSCodeCheckbox,
  VSCodeRadio,
  VSCodeLink,
  VSCodeProgressRing,
} from "@vscode/webview-ui-toolkit/react";

import { useState } from "react";
import { useEffect } from "react";

interface HeaderProps {
  vscodeApi: any;
  searchEnabled: boolean;
  language: Language;
  user: User | undefined;
  setLoading: (loading: boolean) => void;
  isLoading: boolean;
  initialLoading: boolean;
  searchPublic: boolean;
  setSearchPublic: (loading: boolean) => void;
  searchPrivate: boolean;
  setSearchPrivate: (loading: boolean) => void;
  searchSubscribedOnly: boolean;
  setSearchSubscribedOnly: (loading: boolean) => void;
  term: string;
  setTerm: (term: string) => void;
}

export const Header = (props: HeaderProps) => {
  const [debounceTimeout, setDebounceTimeout] = useState(null);

  const refreshPage = async () => {
    await props.vscodeApi.postMessage({
      command: "search",
      term: props.term,
      onlyPublic: props.searchPublic === true ? true : undefined,
      onlyPrivate: props.searchPrivate === true ? true : undefined,
      onlySubscribed: props.searchSubscribedOnly === true ? true : undefined,
    });
  };

  const requestUser = async () => {
    await props.vscodeApi.postMessage({
      command: "getUser",
    });
  };
  const requestSetup = async () => {
    await props.vscodeApi.postMessage({
      command: "setup",
    });
  };

  useEffect(() => {
    props.setLoading(true);
    refreshPage();
  }, [
    props.searchPublic,
    props.searchPrivate,
    props.searchSubscribedOnly,
    props.term,
  ]);

  useEffect(() => {
    refreshPage();
    requestUser();
    requestSetup();
  }, []);

  const deBounceTerm = (term: string) => {
    clearTimeout(debounceTimeout);
    setDebounceTimeout(
      setTimeout(() => {
        props.setTerm(term);
      }, 1000)
    );
  };

  if (props.initialLoading) {
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

  return (
    <div
      className="header"
      style={{
        marginBottom: "1em",
      }}
    >
      <div
        style={{
          float: "right",
          marginTop: "0.3em",
        }}
      >
        {props.user !== undefined ? (
          <div>
            Logged as{" "}
            <VSCodeLink href="https://app.codiga.io/account/profile">
              {props.user.username}
            </VSCodeLink>
          </div>
        ) : (
          <div>
            Anonymous user (
            <VSCodeLink href="https://app.codiga.io/account/auth/vscode">
              log in
            </VSCodeLink>
            )
          </div>
        )}
        {props.language !== Language.Unknown && (
          <div style={{ textAlign: "right" }}>{props.language}</div>
        )}
      </div>
      <h1>Code Snippets Search</h1>

      {props.initialLoading === false && (
        <>
          <div>
            <VSCodeTextField
              type="text"
              id="search"
              style={{
                width: "100%",
              }}
              placeholder="Search for snippets"
              disabled={props.language === Language.Unknown}
              onInput={(e) => {
                props.setLoading(true);
                const newTerm = e.target.value;
                deBounceTerm(newTerm);
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "left",
            }}
          >
            <VSCodeRadio
              id="snippetsPublicAndPrivate"
              name="snippetsPrivacy"
              disabled={props.language === Language.Unknown}
              style={{
                minWidth: "50%",
              }}
              checked={
                props.searchPublic === false && props.searchPrivate === false
              }
              onClick={() => {
                props.setSearchPrivate(false);
                props.setSearchPublic(false);
              }}
            >
              All Snippets
            </VSCodeRadio>
            <VSCodeRadio
              id="snippetsPublic"
              name="snippetsPrivacy"
              checked={props.searchPublic}
              style={{
                minWidth: "50%",
              }}
              disabled={
                props.user === undefined || props.language === Language.Unknown
              }
              hoverText="bla"
              onClick={() => {
                props.setSearchPrivate(false);
                props.setSearchPublic(!props.searchPublic);
              }}
            >
              Public Snippets Only
            </VSCodeRadio>
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "left",
            }}
          >
            <VSCodeRadio
              type="radio"
              id="snippetsPrivate"
              name="snippetsPrivacy"
              checked={props.searchPrivate}
              disabled={
                props.user === undefined || props.language === Language.Unknown
              }
              style={{
                minWidth: "50%",
              }}
              onClick={() => {
                props.setSearchPrivate(!props.searchPrivate);
                props.setSearchPublic(false);
              }}
            >
              Private Snippets Only
            </VSCodeRadio>

            <VSCodeCheckbox
              type="checkbox"
              id="checkboxOnlySubscribed"
              name="onlySubscribed"
              checked={props.searchSubscribedOnly}
              disabled={
                props.user === undefined || props.language === Language.Unknown
              }
              style={{
                minWidth: "50%",
              }}
              onClick={() => {
                props.setSearchSubscribedOnly(!props.searchSubscribedOnly);
              }}
            >
              Favorite Snippets Only
            </VSCodeCheckbox>
          </div>
        </>
      )}
    </div>
  );
};
