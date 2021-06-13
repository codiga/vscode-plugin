import { gql } from "@apollo/client/core";
import { DocumentNode } from "graphql/language/ast";

export const GET_USER: DocumentNode = gql`
  query getUser {
    user {
      username
    }
  }
`;

export const GET_FILE_ANALYSIS: DocumentNode = gql`
  query getFileAnalysis($identifier: Long!) {
    getFileAnalysis(id: $identifier) {
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
