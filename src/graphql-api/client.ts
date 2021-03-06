import { GraphQLClient } from "graphql-request";
import { GRAPHQL_ENDPOINT } from "../constants";
import { getAccessKey, getApiToken, getSecretKey } from "./configuration";

let client: GraphQLClient;

/**
 * Initialize the GraphQL client that will be used
 * to perform all the GraphQL request.
 */
export function initializeClient(): void {
  client = new GraphQLClient(GRAPHQL_ENDPOINT);
}

function generateHeaders(): Record<string, string> {
  const accessKey = getAccessKey();
  const secretKey = getSecretKey();
  const apiToken = getApiToken();

  /**
   * First, check if there is a token. If that is the case,
   * prioritize its use.
   */
  if (apiToken && apiToken.length > 20) {
    return {
      "X-Api-Token": apiToken,
    };
  }

  if (!accessKey || !secretKey) {
    return {};
  }

  const headers = {
    "X-Access-Key": accessKey,
    "X-Secret-Key": secretKey,
  };
  return headers;
}

/**
 * That is the main function to perform a GraphQL query. This is the main function
 * being used across the codebase.
 * @param graphqlQuery
 * @returns
 */
export function doQuery(
  graphqlQuery: string,
  variables: Record<
    string,
    string | undefined | null | number | boolean | string[]
  > = {}
) {
  const query = client
    .request(graphqlQuery, variables, generateHeaders())
    .catch((e) => {
      return undefined;
    });
  return query;
}

/**
 * Similar than doQuery but for a mutation.
 * @param graphqlMutation - mutation to execute
 * @param variables - variable to pass
 * @returns - the result of the mutation or undefined if an error was raised.
 */
export function doMutation(
  graphqlMutation: string,
  variables: Record<string, string | undefined | number | null> = {}
) {
  const query = client
    .request(graphqlMutation, variables, generateHeaders())
    .catch((e) => {
      console.error("exception");
      console.debug(e);
      return undefined;
    });
  return query;
}
