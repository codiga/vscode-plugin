export interface RuleSet {
  id: string;
  rules: Rule[];
}

export interface Rule {
  id: string;
  language: string;
  type: string;
  entityChecked: string | null;
  contentBase64: string;
  pattern: string | null;
}

export interface RosiePosition {
  line: number;
  col: number;
}

export interface RosieFixEdit {
  start: RosiePosition;
  end: RosiePosition;
  content: string | undefined;
  editType: string;
}

export interface RosieFix {
  description: string;
  edits: RosieFixEdit[];
}

export interface Violation {
  message: string;
  start: RosiePosition;
  end: RosiePosition;
  severity: string;
  category: string;
  fixes: RosieFix[];
}

export interface RuleResponse {
  errors: string[];
  identifier: string;
  violations: Violation[];
  executionTimeMs: number;
}

export interface RosieResponse {
  ruleResponses: RuleResponse[];
  errors: string[];
}
