/**
 * Creates a global variable, so that we can bypass creating an actual server connection in server.ts.
 *
 * To enable test mode, add `global.isInTestMode = true` in test files before any import statement from server.ts,
 * so that it is set before the server.ts module is loaded.
 *
 * It needs to be added in all server side tests that directly or indirectly load server.ts,
 * so that it doesn't matter in what order the tests are executed, it will be set.
 */
declare var isInTestMode: boolean;
globalThis.isInTestMode = false;
