import * as path from "path";
import { runTests } from "@vscode/test-electron";

async function main() {
  try {
    // The folder containing the Extension Manifest package.json
    // Passed to `--extensionDevelopmentPath`
    const extensionDevelopmentPath = path.resolve(__dirname, "../..");

    // The path to test runner
    // Passed to --extensionTestsPath
    const extensionTestsPath = path.resolve(__dirname, "./index");

    const pythonWorkspace = path.resolve(
      __dirname,
      "../../test-fixtures/python-workspace"
    );
    const javascriptWorkspace = path.resolve(
      __dirname,
      "../../test-fixtures/javascript-workspace"
    );
    const typescriptWorkspace = path.resolve(
      __dirname,
      "../../test-fixtures/javascript-workspace"
    );
    /**
     * Use win64 instead of win32 for testing Windows
     */
    if (process.platform === "win32") {
      await runTests({
        extensionDevelopmentPath,
        extensionTestsPath,
        version: "1.70.0",
        platform: "win32-x64-archive",
        launchArgs: [pythonWorkspace, "--disable-extensions"],
      });
      await runTests({
        extensionDevelopmentPath,
        extensionTestsPath,
        version: "1.70.0",
        platform: "win32-x64-archive",
        launchArgs: [javascriptWorkspace, "--disable-extensions"],
      });
      await runTests({
        extensionDevelopmentPath,
        extensionTestsPath,
        version: "1.70.0",
        platform: "win32-x64-archive",
        launchArgs: [typescriptWorkspace, "--disable-extensions"],
      });
    } else {
      // Download VS Code, unzip it and run the integration test
      await runTests({
        extensionDevelopmentPath,
        extensionTestsPath,
        launchArgs: [pythonWorkspace, "--disable-extensions"],
      });
      await runTests({
        extensionDevelopmentPath,
        extensionTestsPath,
        launchArgs: [javascriptWorkspace, "--disable-extensions"],
      });
      await runTests({
        extensionDevelopmentPath,
        extensionTestsPath,
        launchArgs: [typescriptWorkspace, "--disable-extensions"],
      });
    }
  } catch (err) {
    console.error("Failed to run tests");
    process.exit(1);
  }
}

main();
