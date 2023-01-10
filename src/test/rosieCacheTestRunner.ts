import {runTests} from "./testRunner";

export function run(): Promise<void> {
  return runTests("**/suite/rosie/rosie-cache.test.js");
}
