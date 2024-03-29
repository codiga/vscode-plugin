
export const GRAPHQL_ENDPOINT_PROD = "https://api.codiga.io/graphql";
// export const GRAPHQL_ENDPOINT_STAGING = "https://api-staging.codiga.io/graphql";

export const API_TOKEN_HEADER_KEY = "X-Api-Token";
export const USER_AGENT_HEADER_KEY = "User-Agent";

export const DIAGNOSTIC_SOURCE = "Codiga";

// 10 seconds
export const RULES_POLLING_INTERVAL_MS = 10000;

// time before we wait doing a code analysis
export const TIME_BEFORE_STARTING_ANALYSIS_MILLISECONDS = 500;
// 10 minutes
export const RULES_MAX_TIME_IN_CACHE_MS = 600000;

export const CODIGA_RULESET_NAME_PATTERN = /^[a-z0-9][a-z0-9-]{4,31}$/;

export const CODIGA_RULES_FILE = "codiga.yml";

export const ELEMENT_CHECKED_FUNCTION_CALL = "functioncall";
export const ELEMENT_CHECKED_IF_CONDITION = "ifcondition";
export const ELEMENT_CHECKED_FOR_LOOP = "forloop";
export const ELEMENT_CHECKED_FUNCTION_DEFINITION = "functiondefinition";
export const ELEMENT_CHECKED_TRYBLOCK = "tryblock";
export const ELEMENT_CHECKED_IMPORT = "import";
export const ELEMENT_CHECKED_ASSIGNMENT = "assignment";
export const ELEMENT_CHECKED_TYPE = "type";
export const ELEMENT_CHECKED_INTERFACE = "interface";
export const ELEMENT_CHECKED_HTML_ELEMENT = "htmlelement";
export const ELEMENT_CHECKED_CLASS_DEFINITION = "classdefinition";
export const ELEMENT_CHECKED_FUNCTION_EXPRESSION = "functionexpression";
export const ELEMENT_CHECKED_VARIABLE_DECLARATION = "variabledeclaration";
export const ELEMENT_CHECKED_ANY = "any";

export const ROSIE_ENTITY_CHECKED_FUNCTION_CALL = "functioncall";
export const ROSIE_ENTITY_CHECKED_IF_CONDITION = "ifcondition";
export const ROSIE_ENTITY_FOR_LOOP = "forloop";
export const ROSIE_ENTITY_FUNCTION_DEFINITION = "functiondefinition";
export const ROSIE_ENTITY_TRYBLOCK = "tryblock";
export const ROSIE_ENTITY_IMPORT = "import";
export const ROSIE_ENTITY_ASSIGNMENT = "assign";
export const ROSIE_ENTITY_TYPE = "type";
export const ROSIE_ENTITY_INTERFACE = "interface";
export const ROSIE_ENTITY_HTML_ELEMENT = "htmlelement";
export const ROSIE_ENTITY_CLASS_DEFINITION = "classdefinition";
export const ROSIE_ENTITY_FUNCTION_EXPRESSION = "functionexpression";
export const ROSIE_ENTITY_VARIABLE_DECLARATION = "variabledeclaration";
export const ROSIE_ENTITY_ANY = "any";

export const ELEMENT_CHECKED_TO_ENTITY_CHECKED: Map<string, string> = new Map([
  [ELEMENT_CHECKED_FUNCTION_CALL, ROSIE_ENTITY_CHECKED_FUNCTION_CALL],
  [ELEMENT_CHECKED_IF_CONDITION, ROSIE_ENTITY_CHECKED_IF_CONDITION],
  [ELEMENT_CHECKED_FOR_LOOP, ROSIE_ENTITY_FOR_LOOP],
  [ELEMENT_CHECKED_FUNCTION_DEFINITION, ROSIE_ENTITY_FUNCTION_DEFINITION],
  [ELEMENT_CHECKED_TRYBLOCK, ROSIE_ENTITY_TRYBLOCK],
  [ELEMENT_CHECKED_IMPORT, ROSIE_ENTITY_IMPORT],
  [ELEMENT_CHECKED_ASSIGNMENT, ROSIE_ENTITY_ASSIGNMENT],
  [ELEMENT_CHECKED_TYPE, ROSIE_ENTITY_TYPE],
  [ELEMENT_CHECKED_INTERFACE, ROSIE_ENTITY_INTERFACE],
  [ELEMENT_CHECKED_HTML_ELEMENT, ROSIE_ENTITY_HTML_ELEMENT],
  [ELEMENT_CHECKED_CLASS_DEFINITION, ROSIE_ENTITY_CLASS_DEFINITION],
  [ELEMENT_CHECKED_FUNCTION_EXPRESSION, ROSIE_ENTITY_FUNCTION_EXPRESSION],
  [ELEMENT_CHECKED_VARIABLE_DECLARATION, ROSIE_ENTITY_VARIABLE_DECLARATION],
  [ELEMENT_CHECKED_ANY, ROSIE_ENTITY_ANY],
]);
