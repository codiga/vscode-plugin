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
      isSubscribed
      imports
      shortcut
      language
      creationTimestampMs
      vscodeFormat
      presentableFormat
      downvotes
      upvotes
      owner {
        id
        displayName
        hasSlug
        slug
        accountType
      }
      groups {
        id
        name
        type
      }
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
      isSubscribed
      keywords
      tags
      code
      imports
      shortcut
      language
      creationTimestampMs
      vscodeFormat
      presentableFormat
      downvotes
      upvotes
      cookbook {
        id
        isSubscribed
        name
      }
      owner {
        displayName
        slug
        hasSlug
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
      downvotes
      upvotes
      owner {
        id
        displayName
        slug
        hasSlug
      }
      groups {
        id
        name
        type
      }
    }
  }
`;

export const GET_RULESETS_FOR_CLIENT: string = gql`
  query getRulesetsForClient($fingerprint: String, $names: [String!]!) {
    ruleSetsForClient(names: $names, fingerprint: $fingerprint) {
      id
      name
      rules(howmany: 10000, skip: 0) {
        id
        name
        content
        ruleType
        language
        pattern
        elementChecked
      }
    }
  }
`;

export const GET_RULESETS_LAST_UPDATED_TIMESTAMP: string = gql`
  query getRulesetsLastUpdatedTimestamp(
    $fingerprint: String
    $names: [String!]!
  ) {
    ruleSetsLastUpdatedTimestamp(names: $names, fingerprint: $fingerprint)
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

export const SUBSCRIBE_TO_RECIPE = gql`
  mutation subscribeToRecipe($id: Long!) {
    subscribeToRecipe(id: $id)
  }
`;

export const UNSUBSCRIBE_TO_RECIPE = gql`
  mutation unsubscribeFromRecipe($id: Long!) {
    unsubscribeFromRecipe(id: $id)
  }
`;
