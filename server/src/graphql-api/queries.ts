import { gql } from "graphql-request";

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
