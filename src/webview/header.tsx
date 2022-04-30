import * as React from "react";
import { Language, User } from "../graphql-api/types";
import {
  VSCodeTextField,
  VSCodeCheckbox,
  VSCodeRadio,
  VSCodeLink,
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
    console.log(searchPublic);
    console.log(searchPrivate);
    console.log(searchSubscribedOnly);

    props.vscodeApi.postMessage({
      command: "search",
      term: term,
      onlyPublic: searchPublic === true ? true : undefined,
      onlyPrivate: searchPrivate === true ? true : undefined,
      onlySubscribed: searchSubscribedOnly === true ? true : undefined,
    });
  };

  useEffect(() => {
    props.setLoading(true);
    refreshPage();
  }, [searchPublic, searchPrivate, searchSubscribedOnly, term]);

  const deBounceTerm = (term: string) => {
    clearTimeout(debounceTimeout);
    setDebounceTimeout(
      setTimeout(() => {
        setTerm(term);
      }, 1000)
    );
  };

  return (
    <div className="header">
      {props.user !== undefined ? (
        <div
          style={{
            float: "right",
            marginTop: "0.5em",
          }}
        >
          Logged as{" "}
          <VSCodeLink href="https://app.codiga.io/account/profile">
            {props.user.username}
          </VSCodeLink>
        </div>
      ) : (
        <div
          style={{
            float: "right",
            marginTop: "0.5em",
          }}
        >
          Anonymous user (
          <VSCodeLink href="https://app.codiga.io/account/auth/vscode">
            log in
          </VSCodeLink>
          )
        </div>
      )}
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
              onInput={(e) => {
                console.log("bla");
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
              type="radio"
              id="snippetsPublicAndPrivate"
              name="snippetsPrivacy"
              style={{
                minWidth: "50%",
              }}
              checked={searchPublic === false && searchPrivate === false}
              onClick={() => {
                setSearchPrivate(false);
                setSearchPublic(false);
              }}
            >
              Public + Private Snippets
            </VSCodeRadio>
            <VSCodeRadio
              type="radio"
              id="snippetsPublic"
              name="snippetsPrivacy"
              checked={searchPublic}
              style={{
                minWidth: "50%",
              }}
              disabled={props.user === undefined}
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
              disabled={props.user === undefined}
              style={{
                minWidth: "50%",
              }}
              onClick={() => {
                setSearchPrivate(!searchPrivate);
                setSearchPublic(false);
              }}
            >
              Private Snippets only
            </VSCodeRadio>

            <VSCodeCheckbox
              type="checkbox"
              id="checkboxOnlySubscribed"
              name="onlySubscribed"
              checked={searchSubscribedOnly}
              disabled={props.user === undefined}
              style={{
                minWidth: "50%",
              }}
              onClick={() => {
                setSearchSubscribedOnly(!searchSubscribedOnly);
              }}
            >
              Subscribed Snippets Only
            </VSCodeCheckbox>
          </div>
        </>
      )}
    </div>
  );
};
