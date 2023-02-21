import {runTests} from "./testRunner";

export function run(): Promise<void> {
  return runTests("**/codiga-file-suggestion.test.js");
}
