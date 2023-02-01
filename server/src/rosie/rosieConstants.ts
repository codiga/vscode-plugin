import { Language } from "../graphql-api/types";

// Severity constants
export const ROSIE_SEVERITY_CRITICAL = "CRITICAL";
export const ROSIE_SEVERITY_ERROR = "ERROR";
export const ROSIE_SEVERITY_INFORMATIONAL = "INFORMATIONAL";
export const ROSIE_SEVERITY_WARNING = "WARNING";

// Endpoints
export const ROSIE_ENDPOINT_PROD = "https://analysis.codiga.io/analyze";
export const ROSIE_ENDPOINT_STAGING =
  "https://analysis-staging.codiga.io/analyze";

export const GRAPHQL_LANGUAGE_TO_ROSIE_LANGUAGE: Map<Language, string> =
  new Map<Language, string>([
    [Language.Python, "python"],
    [Language.Javascript, "javascript"],
    [Language.Typescript, "typescript"],
    [Language.C, "c"],
    [Language.Csharp, "c#"],
    [Language.Java, "java"],
  ]);
