import {RemoteConsole} from "vscode-languageserver";

/**
 * Acts as replacement for the regular Node console. This wrapper helps avoid using the server connection object
 * throughout the project.
 */
let _console: RemoteConsole | Console;

/**
 * Saves the language server connection's RemoteConsole, or if in test mode, then uses the Node console.
 *
 * @param _remoteConsole the remote console
 */
export function initConsole(_remoteConsole: RemoteConsole) {
    _console = !global.isInTestMode ? _remoteConsole : console;
}

/**
 * Sends a log-level message.
 *
 * @param message the log message
 */
export function log(message: string) {
    _console.log(message);
}

/**
 * Sends an error-level message.
 *
 * @param message the log message
 */
export function error(message: string) {
    _console.error(message);
}
