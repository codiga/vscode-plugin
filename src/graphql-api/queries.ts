import { gql } from "graphql-request";
import { DocumentNode } from "graphql/language/ast";

export const GET_USER: string = gql`
  query getUser {
    user {
      username
    }
  }
`;

export const GET_FILE_ANALYSIS: string = gql`
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
