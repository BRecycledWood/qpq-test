export type AnswerValue = string | string[] | number | boolean | null;
export type Answers = Record<string, AnswerValue>;

export type QuestionType =
  | "single"
  | "multi"
  | "number"
  | "text"
  | "boolean"
  | "yesno"
  | "select"
  | "yes_no"
  | "true_false"
  | "dropdown"
  | "percent"
  | "scale_1_5"
  | "scale_1_10"
  | "short_text"
  | "long_text"
  | "date";

export interface QuestionOption {
  id: string;
  label: string;
  value?: string;
  points?: number;
  severity?: "info" | "warn" | "critical";
}

export interface BranchingRule {
  id: string;
  condition: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "greater_equal" | "less_equal";
  value: string;
  targetQuestionId: string;
}

export interface Question {
  id: string;
  prompt: string;
  type: QuestionType;
  key?: string;
  helpText?: string;
  category?: string;
  options?: QuestionOption[];
  required?: boolean;
  branchingRules?: BranchingRule[];
  defaultNextQuestionId?: string;
  /** Label for low end of scale (scale_1_5, scale_1_10) */
  minLabel?: string;
  /** Label for high end of scale (scale_1_5, scale_1_10) */
  maxLabel?: string;
}

export interface CalculatedField {
  id: string;
  key: string;
  label: string;
  type: "number" | "boolean" | "text";
  expression: string;
  description?: string;
}

export interface Outcome {
  id: string;
  title: string;
  description?: string;
  status?: "pass" | "caution" | "fail";
  ctaLabel?: string;
  ctaUrl?: string;
  metadata?: Record<string, unknown>;
}

export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "includes"
  | "not_includes"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "answered"
  | "not_answered";

export interface Condition {
  questionId: string;
  operator: ConditionOperator;
  value?: AnswerValue | AnswerValue[];
}

export interface ConditionGroup {
  all?: Condition[];
  any?: Condition[];
}

export interface ShowIfRule {
  questionId: string;
  when: ConditionGroup;
}

export interface DisqualifierRule {
  id: string;
  reason: string;
  when: ConditionGroup;
}

export interface ScoringRule {
  id: string;
  points: number;
  when: ConditionGroup;
}

export interface ThresholdRule {
  id: string;
  minScore: number;
  maxScore?: number;
  outcomeId: string;
}

export interface PricingRule {
  isPaid?: boolean;
  stripePriceId?: string;
  currency?: string;
  amount?: number;
  interval?: "one_time" | "month" | "year";
}

export interface PackDefinition {
  id?: string;
  name?: string;
  description?: string;
  version?: number;
  outcomes: Outcome[];
  questions: Question[];
  calculatedFields?: CalculatedField[];
  showIf?: ShowIfRule[];
  disqualifiers?: DisqualifierRule[];
  scoring?: ScoringRule[];
  thresholds?: ThresholdRule[];
  pricing?: PricingRule;
}
