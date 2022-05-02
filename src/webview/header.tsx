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
}

export const Header = (props: HeaderProps) => {
  const [searchPublic, setSearchPublic] = useState<boolean>(false);
  const [searchPrivate, setSearchPrivate] = useState<boolean>(false);
  const [searchSubscribedOnly, setSearchSubscribedOnly] =
    useState<boolean>(false);
  const [term, setTerm] = useState<string>("");
  const [debounceTimeout, setDebounceTimeout] = useState(null);

  const refreshPage = () => {
    props.vscodeApi.postMessage({
      command: "search",
      term: term,
      onlyPublic: searchPublic === true ? true : undefined,
      onlyPrivate: searchPrivate === true ? true : undefined,
      onlySubscribed: searchSubscribedOnly === true ? true : undefined,
    });
  };

  const requestUser = () => {
    props.vscodeApi.postMessage({
      command: "getUser",
    });
  };

  useEffect(() => {
    props.setLoading(true);
    refreshPage();
  }, [searchPublic, searchPrivate, searchSubscribedOnly, term]);

  useEffect(() => {
    refreshPage();
    requestUser();
  }, []);

  const deBounceTerm = (term: string) => {
    clearTimeout(debounceTimeout);
    setDebounceTimeout(
      setTimeout(() => {
        setTerm(term);
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
              checked={searchPublic === false && searchPrivate === false}
              onClick={() => {
                setSearchPrivate(false);
                setSearchPublic(false);
              }}
            >
              All Snippets
            </VSCodeRadio>
            <VSCodeRadio
              id="snippetsPublic"
              name="snippetsPrivacy"
              checked={searchPublic}
              style={{
                minWidth: "50%",
              }}
              disabled={
                props.user === undefined || props.language === Language.Unknown
              }
              hoverText="bla"
              onClick={() => {
                setSearchPrivate(false);
                setSearchPublic(!searchPublic);
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
              checked={searchPrivate}
              disabled={
                props.user === undefined || props.language === Language.Unknown
              }
              style={{
                minWidth: "50%",
              }}
              onClick={() => {
                setSearchPrivate(!searchPrivate);
                setSearchPublic(false);
              }}
            >
              Private Snippets Only
            </VSCodeRadio>

            <VSCodeCheckbox
              type="checkbox"
              id="checkboxOnlySubscribed"
              name="onlySubscribed"
              checked={searchSubscribedOnly}
              disabled={
                props.user === undefined || props.language === Language.Unknown
              }
              style={{
                minWidth: "50%",
              }}
              onClick={() => {
                setSearchSubscribedOnly(!searchSubscribedOnly);
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
