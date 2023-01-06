import {runTests} from "./testRunner";

export function run(): Promise<void> {
  return runTests("**/rosie-diagnostics.test.js");
}
