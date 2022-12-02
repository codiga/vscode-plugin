import { Language } from "./graphql-api/types";

export const GRAPHQL_ENDPOINT_PROD = "https://api.codiga.io/graphql";
export const GRAPHQL_ENDPOINT_STAGING = "https://api-staging.codiga.io/graphql";

export const CODIGA_EXTENSION_ID = "codiga.vscode-plugin";

export const API_TOKEN_HEADER_KEY = "X-Api-Token";
export const USER_AGENT_HEADER_KEY = "User-Agent";
export const USER_AGENT_HEADER_PRODUCT = "VsCode";

export const CODING_ASSISTANT_WAIT_BEFORE_QUERYING_RESULTS_IN_MS = 200;

export const MESSAGE_STARTUP_SHOW_SHORTCUTS = "View Shortcuts";
export const MESSAGE_STARTUP_SHOW_SNIPPETS = "Search Snippets";
export const MESSAGE_STARTUP_DO_NOT_SHOW_AGAIN = "Do not show again";

export const VALUE_STRING_TRUE = "true";
export const VALUE_STRING_FALSE = "false";

export const DIAGNOSTIC_CODE = "codiga";
export const DIAGNOSTIC_SOURCE = "Codiga";
export const LEARN_MORE_COMMAND = "CODIGA_LEARN_MORE";
export const IGNORE_VIOLATION_COMMAND = "CODIGA_IGNORE_VIOLATION";

export const DIAGNOSTICS_COLLECTION_NAME = "codiga";

export const NODE_PACKAGE_FILE = "package.json";
export const COMPOSER_FILE = "composer.json";
export const REQUIREMENTS_FILE = "requirements.txt";
export const GEMFILE_FILE = "Gemfile";

export const AUTO_COMPLETION_CHARACTER_TRIGGER = "./";

// 10 seconds
export const CODING_ASSISTANT_SHORTCUTS_POLLING_MS = 10000;

// 3 seconds
export const RULES_POLLING_INTERVAL_MS = 3000;

// time before we wait doing a code analysis
export const TIME_BEFORE_STARTING_ANALYSIS_MILLISECONDS = 500;
// 10 minutes
export const CODING_ASSISTANT_MAX_TIME_IN_CACHE_MS = 600000;
export const RULES_MAX_TIME_IN_CACHE_MS = 600000;

export const STARTUP_MESSAGE_MACOS =
  "👋 type / or . in your editor to look for snippets or use ⌘ + SHIFT + S for all shortcuts and ⌘ + SHIFT + C to search snippets.";
export const STARTUP_MESSAGE_WINDOWS =
  "👋 type / or . in your editor to look for snippets or use CTRL + ALT + S for all shortcuts and CTRL + ALT + C to search snippets.";

export const PREFIX_RECENTLY_ADDED_RECIPE = "recently-added-recipe";

export const CODIGA_RULES_DEBUGFILE = ".codigadebug";
export const CODIGA_RULES_FILE = "codiga.yml";

export const ELEMENT_CHECKED_FUNCTION_CALL = "functioncall";
export const ELEMENT_CHECKED_IF_CONDITION = "ifconfition";
export const ELEMENT_CHECKED_FOR_LOOP = "forloop";
export const ELEMENT_CHECKED_FUNCTION_DEFINITION = "functiondefinition";
export const ELEMENT_CHECKED_TRYBLOCK = "tryblock";
export const ELEMENT_CHECKED_IMPORT = "import";
export const ELEMENT_CHECKED_ASSIGNMENT = "assignment";

export const ROSIE_ENTITY_CHECKED_FUNCTION_CALL = "functioncall";
export const ROSIE_ENTITY_CHECKED_IF_CONDITION = "ifconfition";
export const ROSIE_ENTITY_FOR_LOOP = "forloop";
export const ROSIE_ENTITY_FUNCTION_DEFINITION = "functiondefinition";
export const ROSIE_ENTITY_TRYBLOCK = "tryblock";
export const ROSIE_ENTITY_IMPORT = "import";
export const ROSIE_ENTITY_ASSIGNMENT = "assign";

export const ELEMENT_CHECKED_TO_ENTITY_CHECKED: Map<string, string> = new Map([
  [ELEMENT_CHECKED_FUNCTION_CALL, ROSIE_ENTITY_CHECKED_FUNCTION_CALL],
  [ELEMENT_CHECKED_IF_CONDITION, ROSIE_ENTITY_CHECKED_IF_CONDITION],
  [ELEMENT_CHECKED_FOR_LOOP, ROSIE_ENTITY_FOR_LOOP],
  [ELEMENT_CHECKED_FUNCTION_DEFINITION, ROSIE_ENTITY_FUNCTION_DEFINITION],
  [ELEMENT_CHECKED_TRYBLOCK, ROSIE_ENTITY_TRYBLOCK],
  [ELEMENT_CHECKED_IMPORT, ROSIE_ENTITY_IMPORT],
  [ELEMENT_CHECKED_ASSIGNMENT, ROSIE_ENTITY_ASSIGNMENT],
]);

export const INFO_MESSAGE_CODIGA_FILE_KEY = "ignoreCodigaFile";
export const INFO_MESSAGE_CODIGA_FILE =
  "Check for security, code style in your Python code with Codiga";
export const INFO_MESSAGE_CODIGA_FILE_ACTION_CREATE =
  "Create a codiga.yml file to check code";
export const INFO_MESSAGE_CODIGA_FILE_ACTION_IGNORE = "Never remind me";

export const DEFAULT_PYTHON_RULESET_CONFIG = `
rulesets:
  - python-security
  - python-best-practices
  - python-code-style
`.trim();

export const ROSIE_SUPPORTED_LANGUAGES = [Language.Python];

export const ROSIE_LANGUAGE_DETECT_MAX_RESULTS = 1;
