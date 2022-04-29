import * as React from "react";

interface WebviewProps {
  vscode: any;
}

export default class Webview extends React.Component<WebviewProps> {
  constructor(props: any) {
    super(props);

    console.log(props.vscodeApi);
  }
  render() {
    return (
      <div>
        <p>fooba8</p>
      </div>
    );
  }
}
