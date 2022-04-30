import * as React from "react";
import { Language, User } from "../graphql-api/types";
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
        <input
          type="text"
          id="search"
          onChange={(e) => {
            setTerm(e.target.value);
          }}
        />
        <input type="submit" id="submit" />

        <br />
        <input
          type="radio"
          id="snippetsPublicAndPrivate"
          name="snippetsPrivacy"
          checked={searchPublic === false && searchPrivate === false}
          onChange={() => {
            setSearchPrivate(false);
            setSearchPublic(false);
          }}
        />
        <label htmlFor="snippetsPublicAndPrivate">
          Show Public And Private Snippets
        </label>
        <br />
        <input
          type="radio"
          id="snippetsPublic"
          name="snippetsPrivacy"
          checked={searchPublic}
          onChange={() => {
            setSearchPrivate(false);
            setSearchPublic(!searchPublic);
          }}
        />
        <label htmlFor="snippetsPublic">Public Snippets Only</label>
        <br />
        <input
          type="radio"
          id="snippetsPrivate"
          name="snippetsPrivacy"
          checked={searchPrivate}
          onChange={() => {
            setSearchPrivate(!searchPrivate);
            setSearchPublic(false);
          }}
        />
        <label htmlFor="snippetsPrivate">
          Private Snippets only (created by me and shared with groups)
        </label>
        <br />
        <input
          type="checkbox"
          id="checkboxOnlySubscribed"
          name="onlySubscribed"
          checked={searchSubscribedOnly}
          onChange={() => {
            setSearchSubscribedOnly(!searchSubscribedOnly);
          }}
        />
        <label htmlFor="checkboxOnlySubscribed">Subscribed Snippets Only</label>
      </form>
    </div>
  );
};
