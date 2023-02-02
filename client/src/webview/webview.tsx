import * as React from "react";
import { useEffect, useState } from "react";
import { Header } from "./header";
import { Snippets } from "./snippets";
import { Language, User } from "../graphql-api/types";

interface WebviewProps {
  vscodeApi: any;
}

export const Webview = (props: WebviewProps) => {
  const [snippets, setSnippets] = useState([]);
  const [language, setLanguage] = useState(Language.Unknown);
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [user, setUser] = useState<User | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const [searchPublic, setSearchPublic] = useState<boolean>(false);
  const [searchPrivate, setSearchPrivate] = useState<boolean>(false);
  const [searchSubscribedOnly, setSearchSubscribedOnly] =
    useState<boolean>(false);
  const [term, setTerm] = useState<string>("");

  useEffect(() => {
    window.addEventListener("message", (event) => {
      const message = event.data;

      switch (message.command) {
        case "pageChanged":
          setInitialLoading(false);
          setLoading(false);
          if (message.languageString === null) {
            setLanguage(Language.Unknown);
            setSearchEnabled(false);
            setSnippets([]);

            break;
          }

          setSnippets(message.snippets);
          setLanguage(message.languageString);
          setSearchEnabled(true);
          break;

        case "user":
          setUser(message.user);
          break;

        case "setup":
          setSearchPublic(message.onlyPublic);
          setSearchPrivate(message.onlyPrivate);
          setSearchSubscribedOnly(message.onlySubscribed);
          break;
      }
    });
  }, []);

  return (
    <div className="container">
      <Header
        vscodeApi={props.vscodeApi}
        language={language}
        searchEnabled={searchEnabled}
        user={user}
        setLoading={setLoading}
        isLoading={loading}
        initialLoading={initialLoading}
        searchPublic={searchPublic}
        setSearchPublic={setSearchPublic}
        searchPrivate={searchPrivate}
        setSearchPrivate={setSearchPrivate}
        searchSubscribedOnly={searchSubscribedOnly}
        setSearchSubscribedOnly={setSearchSubscribedOnly}
        term={term}
        setTerm={setTerm}
      />
      <Snippets
        snippets={snippets}
        vsCodeApi={props.vscodeApi}
        language={language}
        loading={loading}
        initialLoading={initialLoading}
        user={user}
        searchPublic={searchPublic}
        searchPrivate={searchPrivate}
        searchSubscribedOnly={searchSubscribedOnly}
        term={term}
      />
    </div>
  );
};