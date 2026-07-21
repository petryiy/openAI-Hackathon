import { z } from "zod";
import { formatPolynomial, parsePolynomial, polynomialEquals, polynomialFromFunction } from "@/lib/math/polynomial";
import { differentiate, expressionsEquivalent, formatExpression, parseMathExpression, rational, simplify, type ExpressionAst } from "@/lib/math/expression";
import { LessonLearnerStateSchema, MisconceptionCodeSchema, type DerivativeLessonSpec, type LessonLearnerState, type LessonSpecV2, type MisconceptionCode } from "@/lib/lesson/schema";

const LegacyAttemptRequestSchema = z.object({
  stepId: z.enum(["substitute", "difference", "quotient", "limit"]), expression: z.string().trim().min(1).max(180), learnerState: LessonLearnerStateSchema,
}).strict();

const SymbolicAttemptRequestSchema = z.object({
  stepId: z.string().trim().min(1).max(40),
  responses: z.record(z.string(), z.string().trim().min(1).max(180)),
  learnerState: LessonLearnerStateSchema,
}).strict();

export const AttemptRequestSchema = z.union([LegacyAttemptRequestSchema, SymbolicAttemptRequestSchema]);

export type AttemptResult = {
  correct: boolean; normalizedAnswer?: string; fieldResults?: Record<string, boolean>; misconceptionCode?: MisconceptionCode;
  feedback: string; nextAction: "continue" | "retry" | "play_remediation"; learnerState: LessonLearnerState;
};

const FEEDBACK: Record<MisconceptionCode, string> = {
  INCORRECT_F_X_PLUS_H: "Replace every x in the function with x₀+h before expanding.",
  MISSING_CROSS_TERM: "A cross term is missing from the square or cube expansion. Expand the parentheses separately.",
  WRONG_SUBTRACTION: "Check the sign of every term when subtracting f(x₀).",
  DID_NOT_DIVIDE_BY_H: "You found the change in function value; now divide the entire expression by h.",
  DID_NOT_CANCEL_H: "Factor and cancel the common h before taking h toward zero.",
  SUBSTITUTED_ZERO_TOO_EARLY: "Substituting h=0 now creates 0/0. Simplify the difference quotient first.",
  FUNCTION_VALUE_AS_DERIVATIVE: "Function value describes position; the derivative describes change at that point.",
  ARITHMETIC_ERROR: "The approach is close. Recheck the coefficients and signs.",
  WRONG_DERIVATIVE_RULE: "Read the outermost operation first; it determines the rule you must assemble.",
  OUTER_INNER_REVERSED: "Keep the inside expression intact while differentiating the outer function.",
  MISSING_INNER_DERIVATIVE: "The outer derivative must be multiplied by the derivative of the inside expression.",
  PRODUCT_OF_DERIVATIVES: "The product rule has two terms: u′v + uv′, not u′v′.",
  MISSING_PRODUCT_TERM: "One product-rule term is missing. Differentiate each factor once while holding the other fixed.",
  QUOTIENT_ORDER_REVERSED: "Keep the numerator order u′v − uv′.",
  MISSING_DENOMINATOR_SQUARE: "The quotient-rule denominator is v².",
  STANDARD_DERIVATIVE_ERROR: "Recheck the registered derivative for sin, cos, exp, or ln.",
  ALGEBRA_SIMPLIFICATION_ERROR: "The rule is assembled; now combine constants and preserve every factor and sign.",
};

function withAttempt(state: LessonLearnerState, stepId: string, correct: boolean, code?: MisconceptionCode) {
  const attempts = (state.stepAttempts[stepId] ?? 0) + 1;
  return {
    attempts,
    learnerState: {
      ...state,
      stepAttempts: { ...state.stepAttempts, [stepId]: attempts },
      completedStepIds: correct ? Array.from(new Set([...state.completedStepIds, stepId])) : state.completedStepIds,
      possibleMisconceptions: code ? Array.from(new Set([...state.possibleMisconceptions, code])) : state.possibleMisconceptions,
    },
  };
}

function classifyLegacy(stepId: string, answer: ReturnType<typeof parsePolynomial>, lesson: Extract<DerivativeLessonSpec, { schemaVersion: 1 }>): MisconceptionCode {
  const { coefficients, evaluationPoint } = lesson.guidedPractice.function;
  if (stepId === "substitute") return coefficients[2] || coefficients[3] ? "MISSING_CROSS_TERM" : "INCORRECT_F_X_PLUS_H";
  if (stepId === "difference") return "WRONG_SUBTRACTION";
  if (stepId === "quotient") {
    if (polynomialEquals(answer, polynomialFromFunction(coefficients, evaluationPoint, "difference"))) return "DID_NOT_DIVIDE_BY_H";
    if (answer.size === 0) return "SUBSTITUTED_ZERO_TOO_EARLY";
    return "DID_NOT_CANCEL_H";
  }
  const functionValue = coefficients.reduce((sum, coefficient, degree) => sum + coefficient * evaluationPoint ** degree, 0);
  if (polynomialEquals(answer, parsePolynomial(String(functionValue)))) return "FUNCTION_VALUE_AS_DERIVATIVE";
  return "ARITHMETIC_ERROR";
}

function classifySymbolic(lesson: LessonSpecV2, stepKind: LessonSpecV2["guidedPractice"]["steps"][number]["kind"], answers: ExpressionAst[]): MisconceptionCode {
  if (stepKind === "decompose") return lesson.capability === "chain" ? "OUTER_INNER_REVERSED" : "WRONG_DERIVATIVE_RULE";
  if (stepKind === "differentiate_parts") return lesson.capability === "chain" ? "MISSING_INNER_DERIVATIVE" : lesson.capability === "standard_function" ? "STANDARD_DERIVATIVE_ERROR" : "ALGEBRA_SIMPLIFICATION_ERROR";
  const answer = answers[0]; const source = lesson.mathModel.sourceExpression;
  if (lesson.capability === "chain" && source.type === "power") {
    const missingInner = simplify({ type: "multiply", factors: [rational(source.exponent), { type: "power", base: source.base, exponent: source.exponent - 1 }] });
    if (answer && expressionsEquivalent(answer, missingInner)) return "MISSING_INNER_DERIVATIVE";
  }
  if (lesson.capability === "product" && source.type === "multiply" && source.factors.length === 2 && answer) {
    const productOfDerivatives = simplify({ type: "multiply", factors: source.factors.map(differentiate) });
    if (expressionsEquivalent(answer, productOfDerivatives)) return "PRODUCT_OF_DERIVATIVES";
    return "MISSING_PRODUCT_TERM";
  }
  if (lesson.capability === "quotient") return "QUOTIENT_ORDER_REVERSED";
  if (lesson.capability === "standard_function") return "STANDARD_DERIVATIVE_ERROR";
  return "ALGEBRA_SIMPLIFICATION_ERROR";
}

export function gradeAttempt(lesson: DerivativeLessonSpec, rawInput: z.infer<typeof AttemptRequestSchema>): AttemptResult {
  const input = AttemptRequestSchema.parse(rawInput);
  if (lesson.schemaVersion === 1) {
    if (!("expression" in input)) throw new Error("This lesson expects one polynomial expression.");
    const answer = parsePolynomial(input.expression);
    const expected = polynomialFromFunction(lesson.guidedPractice.function.coefficients, lesson.guidedPractice.function.evaluationPoint, input.stepId);
    const correct = polynomialEquals(answer, expected);
    const code = correct ? undefined : MisconceptionCodeSchema.parse(classifyLegacy(input.stepId, answer, lesson));
    const state = withAttempt(input.learnerState, input.stepId, correct, code);
    return { correct, normalizedAnswer: formatPolynomial(answer), misconceptionCode: code, feedback: correct ? "This step is valid. Keep going." : FEEDBACK[code!], nextAction: correct ? "continue" : state.attempts >= 2 ? "play_remediation" : "retry", learnerState: state.learnerState };
  }
  if (!("responses" in input)) throw new Error("This lesson expects the named step fields.");
  const step = lesson.guidedPractice.steps.find((item) => item.id === input.stepId);
  if (!step && input.stepId === "remediation-check") {
    const response = input.responses.answer;
    if (!response) throw new Error("Complete the remediation check.");
    const answer = parseMathExpression(response); const correct = expressionsEquivalent(answer, lesson.remediationCheck.expectedExpression);
    const state = withAttempt(input.learnerState, input.stepId, correct, correct ? undefined : "ALGEBRA_SIMPLIFICATION_ERROR");
    state.learnerState.completedStepIds = state.learnerState.completedStepIds.filter((id) => id !== "remediation-check");
    return { correct, fieldResults: { answer: correct }, normalizedAnswer: formatExpression(answer), misconceptionCode: correct ? undefined : "ALGEBRA_SIMPLIFICATION_ERROR", feedback: correct ? "The repair step is valid. Return to the original problem." : "Recheck this smaller version before returning to the original step.", nextAction: correct ? "continue" : "retry", learnerState: state.learnerState };
  }
  if (!step) throw new Error("Unknown guided-practice step.");
  const parsedAnswers = step.fields.map((field) => {
    const response = input.responses[field.id];
    if (!response) throw new Error(`Complete ${field.label}.`);
    return parseMathExpression(response);
  });
  const fieldResults = Object.fromEntries(step.fields.map((field, index) => [field.id, expressionsEquivalent(parsedAnswers[index], field.expected)]));
  const correct = Object.values(fieldResults).every(Boolean);
  const code = correct ? undefined : MisconceptionCodeSchema.parse(classifySymbolic(lesson, step.kind, parsedAnswers));
  const state = withAttempt(input.learnerState, step.id, correct, code);
  return { correct, fieldResults, normalizedAnswer: parsedAnswers.map(formatExpression).join("; "), misconceptionCode: code, feedback: correct ? "Every field is mathematically equivalent to the verified step." : FEEDBACK[code!], nextAction: correct ? "continue" : state.attempts >= 2 ? "play_remediation" : "retry", learnerState: state.learnerState };
}

export function gradeTransfer(lesson: DerivativeLessonSpec, expression: string) {
  if (lesson.schemaVersion === 1) {
    const answer = parsePolynomial(expression); const expected = polynomialFromFunction(lesson.transferTask.function.coefficients, lesson.transferTask.function.evaluationPoint, "limit");
    return { correct: polynomialEquals(answer, expected), normalizedAnswer: formatPolynomial(answer) };
  }
  const answer = parseMathExpression(expression);
  return { correct: expressionsEquivalent(answer, lesson.transferTask.expectedExpression), normalizedAnswer: formatExpression(answer) };
}
