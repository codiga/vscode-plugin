import { ELEMENT_CHECKED_TO_ENTITY_CHECKED } from "../constants";
import { Rule } from "../rosie/rosieTypes";
import { getUserFingerprint } from "../utils/configurationUtils";
import { doQuery } from "./client";
import {
  GET_RULESETS_FOR_CLIENT,
  GET_RULESETS_LAST_UPDATED_TIMESTAMP,
} from "./queries";
import { RulesetType } from "./types";
import {getMockRules, getMockRulesLastUpdatedTimestamp} from "./rulesMocks";

/**
 * Map the element checked value from the GraphQL API
 * into an entityChecked value we actually pass to Rosie.
 * @param elementChecked - the GraphQL elementChecked value
 * @returns
 */
const graphQlElementCheckedToRosieEntityCheck = (
  elementChecked: string | undefined
): string | undefined => {
  if (!elementChecked) {
    return undefined;
  }

  return ELEMENT_CHECKED_TO_ENTITY_CHECKED.get(
    elementChecked.toLocaleLowerCase()
  );
};

export async function getRules(rulesetsNames: string[]): Promise<Rule[]> {
  if (global.isInTestMode) {
    return getMockRules(rulesetsNames);
  }

  const userFingerprint = getUserFingerprint();

  const variables: Record<string, string[] | string> = {
    names: rulesetsNames,
    fingerprint: userFingerprint,
  };

  const data = await doQuery(GET_RULESETS_FOR_CLIENT, variables);
  if (!data) {
    return [];
  }

  return data.ruleSetsForClient.flatMap((ruleset: RulesetType) => {
    return ruleset.rules.map((rule) => {
      const entityChecked = graphQlElementCheckedToRosieEntityCheck(
        rule.elementChecked
      );

      return {
        rulesetName: ruleset.name,
        ruleName: rule.name,
        id: `${ruleset.name}/${rule.name}`,
        language: rule.language,
        type: rule.ruleType,
        entityChecked: entityChecked,
        contentBase64: rule.content,
        pattern: rule.pattern,
      };
    });
  });
}

export async function getRulesLastUpdatedTimestamp(
  rulesetsNames: string[]
): Promise<number | undefined> {
  if (global.isInTestMode) {
    return getMockRulesLastUpdatedTimestamp(rulesetsNames);
  }

  const userFingerprint = getUserFingerprint();

  const variables: Record<string, string[] | string> = {
    names: rulesetsNames,
    fingerprint: userFingerprint,
  };

  const data = await doQuery(GET_RULESETS_LAST_UPDATED_TIMESTAMP, variables);
  if (!data) {
    return undefined;
  }

  return data.ruleSetsLastUpdatedTimestamp;
}
