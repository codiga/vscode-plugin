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

  useEffect(() => {
    window.addEventListener("message", (event) => {
      const message = event.data;

      switch (message.command) {
        case "pageChanged":
          if (message.languageString === null) {
            setLanguage(Language.Unknown);
            setSearchEnabled(false);
            setSnippets([]);
            break;
          }

          setSnippets(message.snippets);
          setLanguage(message.languageString);
          setSearchEnabled(true);
          setLoading(false);
          break;

        case "user":
          setUser(message.user);
          break;
      }
    });
  });

  return (
    <div className="container">
      <Header
        vscodeApi={props.vscodeApi}
        language={language}
        searchEnabled={searchEnabled}
        user={user}
        setLoading={setLoading}
        isLoading={loading}
      />
      <Snippets
        snippets={snippets}
        vsCodeApi={props.vscodeApi}
        language={language}
        loading={loading}
      />
    </div>
  );
};
