import * as React from "react";
import * as ReactDOM from "react-dom";
import Webview from "./webview";

declare global {
  interface Window {
    acquireVsCodeApi(): any;
  }
}

const vscode = window.acquireVsCodeApi();
const root = document.getElementById("root");
ReactDOM.render(<Webview vscodeApi={vscode}></Webview>, root);
