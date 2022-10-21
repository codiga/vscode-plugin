export const GRAPHQL_ENDPOINT_PROD = "https://api.codiga.io/graphql";
export const GRAPHQL_ENDPOINT_STAGING = "https://api-staging.codiga.io/graphql";

export const CODING_ASSISTANT_WAIT_BEFORE_QUERYING_RESULTS_IN_MS = 200;

export const MESSAGE_STARTUP_SHOW_SHORTCUTS = "View Shortcuts";
export const MESSAGE_STARTUP_SHOW_SNIPPETS = "Search Snippets";
export const MESSAGE_STARTUP_DO_NOT_SHOW_AGAIN = "Do not show again";

export const DIAGNOSTIC_CODE = "codiga";
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
