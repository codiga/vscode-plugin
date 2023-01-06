import {runTests} from "./testRunner";

export function run(): Promise<void> {
  return runTests("**/suite/**.test.js");
}
