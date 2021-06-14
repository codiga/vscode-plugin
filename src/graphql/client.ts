import {
  ApolloClient,
  InMemoryCache,
  NormalizedCacheObject,
  HttpLink,
  FetchPolicy,
} from "@apollo/client/core";
import { DocumentNode } from "graphql/language/ast";
import { fetch } from "cross-fetch";
import * as vscode from "vscode";
import { GRAPHQL_ENDPOINT } from "../constants";

var client: ApolloClient<NormalizedCacheObject>;

/**
 * Initialize the GraphQL client that will be used
 * to perform all the GraphQL request.
 */
export function initializeClient() {
  client = new ApolloClient({
    uri: GRAPHQL_ENDPOINT,
    link: new HttpLink({
      uri: GRAPHQL_ENDPOINT,
      fetch,
    }),
    cache: new InMemoryCache(),
  });
}

/**
 * Get the access key from the VScode preferences.
 * @returns
 */
function getAccessKey(): string {
  return vscode.workspace.getConfiguration().get("code-inspector.api.accessKey")!;
}

/**
 * Get the secret key from the VScode preferences.
 * @returns
 */
function getSecretKey(): string {
  return vscode.workspace.getConfiguration().get("code-inspector.api.secretKey")!;
}

/**
 * That is the main function to perform a GraphQL query. This is the main function
 * being used across the codebase.
 * @param graphqlQuery
 * @returns
 */
export function doQuery(
  graphqlQuery: DocumentNode,
  variables: Record<string, string | undefined | null | number> = {},
  forceRefetch: boolean = false,
) {
  var fetchPolicy: FetchPolicy = 'cache-first';
  if (forceRefetch) {
    fetchPolicy = 'no-cache';
  }

  const query = client
    .query({
      query: graphqlQuery,
      context: {
        headers: {
          "X-Access-Key": getAccessKey(),
          "X-Secret-Key": getSecretKey(),
        },
      },
      variables: variables,
      fetchPolicy: fetchPolicy,
    })
    .catch(() => {
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
  graphqlMutation: DocumentNode,
  variables: Record<string, string | undefined | null> = {}
) {
  const query = client
    .mutate({
      mutation: graphqlMutation,
      context: {
        headers: {
          "X-Access-Key": getAccessKey(),
          "X-Secret-Key": getSecretKey(),
        },
      },
      variables: variables,
    })
    .catch(() => {
      return undefined;
    });
  return query;
}
