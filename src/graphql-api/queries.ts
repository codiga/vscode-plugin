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
