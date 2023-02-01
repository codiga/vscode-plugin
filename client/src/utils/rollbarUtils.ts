import * as vscode from "vscode";
import * as Rollbar from "rollbar";
import { getExtensionVersion } from "./extensionUtils";

const rollbar = {};
// const rollbar = new Rollbar({
//   accessToken: "006f7f73a626418d845fbd348661724f",
//   environment: "production",
//   autoInstrument: true,
//   wrapGlobalEventHandlers: true,
//   captureUncaught: true,
//   captureUnhandledRejections: true,
//   payload: {
//     codiga_version: getExtensionVersion(),
//     vscode_version: vscode.version,
//   },
// });

const rollbarLogger = (...args: any) => {
  // rollbar.error(...args);
};

export { rollbarLogger };
