import {runTests} from "./testRunner";

export function run(): Promise<void> {
  return runTests("**/rosie-quick-fixes.test.js");
}
