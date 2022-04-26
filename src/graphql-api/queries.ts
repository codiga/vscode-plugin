import { gql } from "graphql-request";

export const GET_USER: string = gql`
  query getUser {
    user {
      accountType
      username
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
      presentableFormat
    }
  }
`;

export const GET_RECIPES_SEMANTIC: string = gql`
  query assistantRecipesSemanticSearch(
    $term: String
    $language: LanguageEnumeration!
    $howmany: Long!
    $skip: Long!
    $onlyPublic: Boolean
    $onlyPrivate: Boolean
    $onlySubscribed: Boolean
  ) {
    assistantRecipesSemanticSearch(
      term: $term
      languages: [$language]
      howmany: $howmany
      skip: $skip
      onlyPublic: $onlyPublic
      onlyPrivate: $onlyPrivate
      onlySubscribed: $onlySubscribed
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
      presentableFormat
      owner {
        username
        accountType
      }
      groups {
        id
        name
      }
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
      presentableFormat
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
