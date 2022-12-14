import * as assert from "assert";
import {
  DEFAULT_JAVASCRIPT_RULESET_CONFIG,
  DEFAULT_PYTHON_RULESET_CONFIG,
  VALUE_STRING_FALSE,
  VALUE_STRING_TRUE,
} from "../../constants";
import {
  createCodigaFile,
  doesCodigaFileExists,
  hasUserIgnoredCodigaSuggestion,
  setUserIgnoreCodigaSuggestion,
  removeCodigaFile,
  isLanguageRosieSupported,
  getCodigaFileContent,
  checkWorkspaceToSuggest,
} from "../../features/codiga-file-suggestion";
import { Language } from "../../graphql-api/types";
import { getWorkspaceRosieLanguage } from "../../rosie/rosieUtils";

suite("codiga-file-suggestion.test.ts", () => {
  test("rosie supported languages", async () => {
    assert(isLanguageRosieSupported(Language.Apex) === false);
    assert(isLanguageRosieSupported(Language.C) === false);
    assert(isLanguageRosieSupported(Language.Cpp) === false);
    assert(isLanguageRosieSupported(Language.Csharp) === false);
    assert(isLanguageRosieSupported(Language.Css) === false);
    assert(isLanguageRosieSupported(Language.Coldfusion) === false);
    assert(isLanguageRosieSupported(Language.Dart) === false);
    assert(isLanguageRosieSupported(Language.Docker) === false);
    assert(isLanguageRosieSupported(Language.Go) === false);
    assert(isLanguageRosieSupported(Language.Haskell) === false);
    assert(isLanguageRosieSupported(Language.Html) === false);
    assert(isLanguageRosieSupported(Language.Java) === false);
    assert(isLanguageRosieSupported(Language.Javascript) === true);
    assert(isLanguageRosieSupported(Language.Json) === false);
    assert(isLanguageRosieSupported(Language.Kotlin) === false);
    assert(isLanguageRosieSupported(Language.Markdown) === false);
    assert(isLanguageRosieSupported(Language.Objectivec) === false);
    assert(isLanguageRosieSupported(Language.Perl) === false);
    assert(isLanguageRosieSupported(Language.Php) === false);
    assert(isLanguageRosieSupported(Language.Python) === true);
    assert(isLanguageRosieSupported(Language.Ruby) === false);
    assert(isLanguageRosieSupported(Language.Rust) === false);
    assert(isLanguageRosieSupported(Language.Sass) === false);
    assert(isLanguageRosieSupported(Language.Scala) === false);
    assert(isLanguageRosieSupported(Language.Scss) === false);
    assert(isLanguageRosieSupported(Language.Shell) === false);
    assert(isLanguageRosieSupported(Language.Swift) === false);
    assert(isLanguageRosieSupported(Language.Solidity) === false);
    assert(isLanguageRosieSupported(Language.Sql) === false);
    assert(isLanguageRosieSupported(Language.Terraform) === false);
    assert(isLanguageRosieSupported(Language.Typescript) === true);
    assert(isLanguageRosieSupported(Language.Twig) === false);
    assert(isLanguageRosieSupported(Language.Yaml) === false);
  });

  test("can a codiga.yml file be created/removed", async () => {
    assert(doesCodigaFileExists() === false);
    await createCodigaFile(Language.Python);
    assert(doesCodigaFileExists() === true);
    await removeCodigaFile();
    assert(doesCodigaFileExists() === false);
  });

  test("check that a codiga file content is returned correctly", async () => {
    assert(getCodigaFileContent(Language.Apex) === "");
    assert(getCodigaFileContent(Language.C) === "");
    assert(getCodigaFileContent(Language.Cpp) === "");
    assert(getCodigaFileContent(Language.Csharp) === "");
    assert(getCodigaFileContent(Language.Css) === "");
    assert(getCodigaFileContent(Language.Coldfusion) === "");
    assert(getCodigaFileContent(Language.Dart) === "");
    assert(getCodigaFileContent(Language.Docker) === "");
    assert(getCodigaFileContent(Language.Go) === "");
    assert(getCodigaFileContent(Language.Haskell) === "");
    assert(getCodigaFileContent(Language.Html) === "");
    assert(getCodigaFileContent(Language.Java) === "");
    assert(
      getCodigaFileContent(Language.Javascript) ===
        DEFAULT_JAVASCRIPT_RULESET_CONFIG
    );
    assert(getCodigaFileContent(Language.Json) === "");
    assert(getCodigaFileContent(Language.Kotlin) === "");
    assert(getCodigaFileContent(Language.Markdown) === "");
    assert(getCodigaFileContent(Language.Objectivec) === "");
    assert(getCodigaFileContent(Language.Perl) === "");
    assert(getCodigaFileContent(Language.Php) === "");
    assert(
      getCodigaFileContent(Language.Python) === DEFAULT_PYTHON_RULESET_CONFIG
    );
    assert(getCodigaFileContent(Language.Ruby) === "");
    assert(getCodigaFileContent(Language.Rust) === "");
    assert(getCodigaFileContent(Language.Sass) === "");
    assert(getCodigaFileContent(Language.Scala) === "");
    assert(getCodigaFileContent(Language.Scss) === "");
    assert(getCodigaFileContent(Language.Shell) === "");
    assert(getCodigaFileContent(Language.Swift) === "");
    assert(getCodigaFileContent(Language.Solidity) === "");
    assert(getCodigaFileContent(Language.Sql) === "");
    assert(getCodigaFileContent(Language.Terraform) === "");
    assert(
      getCodigaFileContent(Language.Typescript) ===
        DEFAULT_JAVASCRIPT_RULESET_CONFIG
    );
    assert(getCodigaFileContent(Language.Twig) === "");
    assert(getCodigaFileContent(Language.Yaml) === "");
  });

  test("no codiga file suggestion, if already ignored", async () => {
    setUserIgnoreCodigaSuggestion(VALUE_STRING_TRUE);
    assert(hasUserIgnoredCodigaSuggestion() === true);
    assert((await checkWorkspaceToSuggest()) === undefined);
  });

  test("no codiga file suggestion, if codiga file exists", async () => {
    setUserIgnoreCodigaSuggestion(VALUE_STRING_FALSE);
    assert(hasUserIgnoredCodigaSuggestion() === false);

    assert(doesCodigaFileExists() === false);
    await createCodigaFile(Language.Python);
    assert((await checkWorkspaceToSuggest()) === undefined);
    await removeCodigaFile();

    assert(doesCodigaFileExists() === false);
    setUserIgnoreCodigaSuggestion(VALUE_STRING_FALSE);
  });

  test("check that a codiga file suggestion should appear", async () => {
    // ensure the an ignored settings are false first
    setUserIgnoreCodigaSuggestion(VALUE_STRING_FALSE);
    assert(hasUserIgnoredCodigaSuggestion() === false);

    // there shouldn't be a codiga.yml file already
    assert(doesCodigaFileExists() === false);

    const workspaceLanguage = await getWorkspaceRosieLanguage();
    const suggestForLanguage = await checkWorkspaceToSuggest();
    if (suggestForLanguage) {
      assert((await checkWorkspaceToSuggest()) === workspaceLanguage);
    }
  });
});
