// import {RuleResponse} from "./rosieTypes";
//
// /**
//  * Provides mock RuleResponse objects for testing.
//  */
// export async function getMockRuleResponses(
//   document: vscode.TextDocument
// ): Promise<RuleResponse[]> {
//   let ruleResponse: RuleResponse;
//
//   //This branch is to provide an updated set of diagnostics when the document changes
//   if (document.lineCount < 4) {
//     ruleResponse = {
//       errors: [],
//       executionTimeMs: 0,
//       identifier: "some_id",
//       violations: [
//         {
//           category: "BEST_PRACTICE",
//           end: {line: 1, col: 10},
//           fixes: [],
//           message: "critical_violation",
//           severity: "CRITICAL",
//           start: {line: 1, col: 5}
//         }
//       ]
//     };
//   } else {
//     ruleResponse = {
//       errors: [],
//       executionTimeMs: 0,
//       identifier: "some_id",
//       violations: [
//         {
//           category: "BEST_PRACTICE",
//           end: {line: 1, col: 10},
//           fixes: [],
//           message: "critical_violation",
//           severity: "CRITICAL",
//           start: {line: 1, col: 5}
//         },
//         {
//           category: "SAFETY",
//           end: {line: 2, col: 10},
//           fixes: [],
//           message: "error_violation",
//           severity: "ERROR",
//           start: {line: 2, col: 5}
//         },
//         {
//           category: "BEST_PRACTICE",
//           end: {line: 3, col: 10},
//           fixes: [],
//           message: "warning_violation",
//           severity: "WARNING",
//           start: {line: 3, col: 5}
//         },
//         {
//           category: "BEST_PRACTICE",
//           end: {line: 4, col: 10},
//           fixes: [],
//           message: "info_violation",
//           severity: "INFORMATIONAL",
//           start: {line: 4, col: 5}
//         }
//       ]
//     };
//   }
//   return [ruleResponse];
// }
