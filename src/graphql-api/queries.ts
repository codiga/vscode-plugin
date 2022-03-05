import { gql } from "graphql-request";

export const GET_USER: string = gql`
  query getUser {
    user {
      accountType
      username
    }
  }
`;

export const GET_PROJECTS: string = gql`
  query getProjects {
    projects(howmany: 100, skip: 0) {
      id
      name
      repository {
        url
        kind
      }
    }
  }
`;

export const GET_FILE_ANALYSIS: string = gql`
  query getFileAnalysis($identifier: Long!, $fingerprint: String) {
    getFileAnalysis(id: $identifier, fingerprint: $fingerprint) {
      status
      id
      filename
      language
      runningTimeSeconds

      violations {
        id
        language
        description
        severity
        category
        line
        lineCount
        tool
        rule
        ruleUrl
      }
    }
  }
`;

export const GET_RECIPES: string = gql`
  query getRecipesForClient(
    $keywords: [String!]!
    $fingerprint: String
    $dependencies: [String!]!
    $parameters: String
    $language: LanguageEnumeration!
    $filename: String
  ) {
    getRecipesForClient(
      keywords: $keywords
      fingerprint: $fingerprint
      dependencies: $dependencies
      parameters: $parameters
      language: $language
      filename: $filename
    ) {
      id
      name
      description
      isPublic
      keywords
      tags
      code
      imports
      shortcut
      language
      creationTimestampMs
      vscodeFormat
    }
  }
`;

export const GET_RECIPES_SEMANTIC: string = gql`
  query assistantRecipesSemanticSearch(
    $term: String
    $language: LanguageEnumeration!
    $howmany: Long!
    $skip: Long!
  ) {
    assistantRecipesSemanticSearch(
      term: $term
      languages: [$language]
      howmany: $howmany
      skip: $skip
    ) {
      id
      name
      description
      isPublic
      keywords
      tags
      code
      imports
      shortcut
      language
      creationTimestampMs
      vscodeFormat
    }
  }
`;

export const GET_RECIPES_BY_SHORTCUT: string = gql`
  query getRecipesForClientByShortcut(
    $term: String
    $fingerprint: String
    $dependencies: [String!]!
    $parameters: String
    $language: LanguageEnumeration!
    $filename: String
  ) {
    getRecipesForClientByShortcut(
      term: $term
      fingerprint: $fingerprint
      dependencies: $dependencies
      parameters: $parameters
      language: $language
      filename: $filename
    ) {
      id
      name
      description
      isPublic
      keywords
      tags
      code
      imports
      shortcut
      language
      creationTimestampMs
      vscodeFormat
    }
  }
`;

export const GET_RECIPES_BY_SHORTCUT_LAST_TIMESTAMP: string = gql`
  query getRecipesForClientByShortcutLastTimestamp(
    $fingerprint: String
    $dependencies: [String!]!
    $language: LanguageEnumeration!
  ) {
    getRecipesForClientByShortcutLastTimestamp(
      fingerprint: $fingerprint
      dependencies: $dependencies
      language: $language
    )
  }
`;
