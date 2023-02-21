import * as vscode from "vscode";
import { CODIGA_EXTENSION_ID } from "../constants";

export function getExtensionVersion(): string | null {
  const codigaExtension = vscode.extensions.getExtension(CODIGA_EXTENSION_ID);

  if (codigaExtension) {
    return codigaExtension.packageJSON.version;
  }
  return null;
}
