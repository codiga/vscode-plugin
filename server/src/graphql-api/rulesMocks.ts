// import {Rule} from "../rosie/rosieTypes";
// import {createMockRule} from "../test/testUtils";
//
// /**
//  * Returns mock rules for testing based on the argument ruleset names.
//  *
//  * @param rulesetsNames the ruleset names
//  */
// export function getMockRules(rulesetsNames: string[]): Rule[] {
//     if (rulesetsNames[0] === "actual-ruleset") {
//       return [
//         createMockRule("", "typescript"),
//         createMockRule("", "typescript")
//       ];
//     } else {
//       return [];
//     }
// }
//
// /**
//  * Returns mock last updated timestamps for rulesets based on the argument ruleset names.
//  *
//  * @param rulesetsNames the ruleset names
//  */
// export function getMockRulesLastUpdatedTimestamp(
//   rulesetsNames: string[]
// ): number | undefined {
//   if (rulesetsNames[0] === "undefined-ruleset") {
//     return undefined;
//   }
//   if (rulesetsNames[0] === "actual-ruleset") {
//     return 100;
//   }
// }
