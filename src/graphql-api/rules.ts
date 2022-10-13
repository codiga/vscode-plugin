import { Rule } from "../rosie/rosieTypes";
import { getUserFingerprint } from "../utils/configurationUtils";
import { doQuery } from "./client";
import {
  GET_RULESETS_FOR_CLIENT,
  GET_RULESETS_LAST_UPDATED_TIMESTAMP,
} from "./queries";
import { RulesetType } from "./types";

export async function getRules(rulesetsNames: string[]): Promise<Rule[]> {
  const userFingerprint = getUserFingerprint();

  const variables: Record<string, string[] | string> = {
    names: rulesetsNames,
    fingerprint: userFingerprint,
  };

  const data = await doQuery(GET_RULESETS_FOR_CLIENT, variables);

  console.log("data");
  console.log(data);

  if (!data) {
    return [];
  }

  return data.ruleSetsForClient.flatMap((ruleset: RulesetType) => {
    return ruleset.rules.map((rule) => {
      return {
        id: `${ruleset.name}/${rule.name}`,
        language: rule.language,
        type: rule.ruleType,
        entityChecked: rule.elementChecked,
        contentBase64: rule.content,
        pattern: rule.pattern,
      };
    });
  });
}

export async function getRulesLastUpdatedTimestamp(
  rulesetsNames: string[]
): Promise<number | undefined> {
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
