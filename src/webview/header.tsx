import * as React from "react";
import { Language, User } from "../graphql-api/types";
import {
  VSCodeTextField,
  VSCodeCheckbox,
  VSCodeRadio,
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

  var lastSearchTerm = "";

  const deBounceTerm = (term: string) => {
    lastSearchTerm = term;
    clearTimeout(debounceTimeout);
    setDebounceTimeout(
      setTimeout(() => {
        setTerm(term);
      }, 1000)
    );
  };

  return (
    <div className="header">
      <h1>{props.language}</h1>
      {props.user !== undefined ? (
        <div>Logged as {props.user.username}</div>
      ) : (
        <div>Not logged in</div>
      )}
      <form
        id="form"
        onSubmit={(e) => {
          e.preventDefault();
          refreshPage();
        }}
      >
        <VSCodeTextField
          type="text"
          id="search"
          onInput={(e) => {
            console.log("bla");
            props.setLoading(true);
            const newTerm = e.target.value;
            deBounceTerm(newTerm);
          }}
        />

        <br />
        <VSCodeRadio
          type="radio"
          id="snippetsPublicAndPrivate"
          name="snippetsPrivacy"
          checked={searchPublic === false && searchPrivate === false}
          onClick={() => {
            setSearchPrivate(false);
            setSearchPublic(false);
          }}
        >
          Show Public And Private Snippets
        </VSCodeRadio>
        <br />
        <VSCodeRadio
          type="radio"
          id="snippetsPublic"
          name="snippetsPrivacy"
          checked={searchPublic}
          onClick={() => {
            setSearchPrivate(false);
            setSearchPublic(!searchPublic);
          }}
        >
          Public Snippets Only
        </VSCodeRadio>
        <br />
        <VSCodeRadio
          type="radio"
          id="snippetsPrivate"
          name="snippetsPrivacy"
          checked={searchPrivate}
          onClick={() => {
            setSearchPrivate(!searchPrivate);
            setSearchPublic(false);
          }}
        >
          Private Snippets only (created by me and shared with groups)
        </VSCodeRadio>

        <br />
        <VSCodeCheckbox
          type="checkbox"
          id="checkboxOnlySubscribed"
          name="onlySubscribed"
          checked={searchSubscribedOnly}
          onClick={() => {
            setSearchSubscribedOnly(!searchSubscribedOnly);
          }}
        >
          Subscribed Snippets Only
        </VSCodeCheckbox>
      </form>
    </div>
  );
};
