import {runTests} from "./testRunner";

export function run(): Promise<void> {
  return runTests("**/suite/completion/*.test.js");
}
