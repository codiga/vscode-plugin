import {runTests} from "./testRunner";

export function run(): Promise<void> {
  return runTests("**/suite/utils/*.test.js");
}
