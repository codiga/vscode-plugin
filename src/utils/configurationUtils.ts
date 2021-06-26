import * as vscode from "vscode";

/**
 * Get the project current associated with the current workspace.
 * @returns either the associated project or undefined.
 */
export function getAssociatedProjectIdentifier(): number | undefined {
  if (vscode.window.activeTextEditor) {
    const currentDocument = vscode.window.activeTextEditor.document;
    const configuration = vscode.workspace.getConfiguration(
      "",
      currentDocument.uri
    );

    return configuration.get("code-inspector.associatedProject");
  } else {
    return undefined;
  }
}
