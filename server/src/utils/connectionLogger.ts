import {RemoteConsole} from "vscode-languageserver";

/**
 * Acts as replacement for the regular Node console. This wrapper helps avoid using the server connection object
 * throughout the project.
 */
let console: RemoteConsole;

/**
 * Saves language server connection's RemoteConsole.
 *
 * @param _console the remote console
 */
export function initConsole(_console: RemoteConsole) {
    console = _console;
}

/**
 * Sends a log-level message.
 *
 * @param message the log message
 */
export function log(message: string) {
    console.log(message);
}

/**
 * Sends an error-level message.
 *
 * @param message the log message
 */
export function error(message: string) {
    console.error(message);
}
