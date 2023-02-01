import * as vscode from "vscode";

/**
 * Save the token passed by the URL in the configuration.
 *
 * URL is in the form of vscode://codiga.vscode-plugin/auth?<api-token>
 */
export class UriHandler implements vscode.UriHandler {
  handleUri(uri: vscode.Uri): vscode.ProviderResult<void> {
    if (uri.path === "/auth" && uri.query) {
      const config = vscode.workspace.getConfiguration(undefined);
      config.update(
        "codiga.api.token",
        uri.query,
        vscode.ConfigurationTarget.Global
      );
      vscode.window.showInformationMessage("Codiga: API token are registered");
    } else {
      vscode.window.showInformationMessage("Codiga: Invalid URI");
    }
  }
}
