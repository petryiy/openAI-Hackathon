import { z } from "zod";
import { formatPolynomial, parsePolynomial, polynomialEquals, polynomialFromFunction } from "@/lib/math/polynomial";
import { LessonLearnerStateSchema, MisconceptionCodeSchema, type LessonLearnerState, type LessonSpec, type MisconceptionCode } from "@/lib/lesson/schema";

export const AttemptRequestSchema = z.object({
  stepId: z.enum(["substitute", "difference", "quotient", "limit"]),
  expression: z.string().trim().min(1).max(120),
  learnerState: LessonLearnerStateSchema,
}).strict();

export type AttemptResult = {
  correct: boolean; normalizedAnswer?: string; misconceptionCode?: MisconceptionCode;
  feedback: string; nextAction: "continue" | "retry" | "play_remediation";
  learnerState: LessonLearnerState;
};

function feedback(code: MisconceptionCode) {
  const english: Record<MisconceptionCode, string> = {
    INCORRECT_F_X_PLUS_H: "Replace every x in the function with x₀+h before expanding.",
    MISSING_CROSS_TERM: "A cross term is missing from the square or cube expansion. Expand the parentheses separately.",
    WRONG_SUBTRACTION: "Check the sign of every term when subtracting f(x₀).",
    DID_NOT_DIVIDE_BY_H: "You found the change in function value; now divide the entire expression by h.",
    DID_NOT_CANCEL_H: "Factor and cancel the common h before taking h toward zero.",
    SUBSTITUTED_ZERO_TOO_EARLY: "Substituting h=0 now creates 0/0. Simplify the difference quotient first.",
    FUNCTION_VALUE_AS_DERIVATIVE: "Function value describes position; the derivative describes change at that point.",
    ARITHMETIC_ERROR: "The approach is close. Recheck the coefficients and signs.",
  };
  return english[code];
}

function classify(stepId: string, answer: ReturnType<typeof parsePolynomial>, lesson: LessonSpec): MisconceptionCode {
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

export function gradeAttempt(lesson: LessonSpec, input: z.infer<typeof AttemptRequestSchema>): AttemptResult {
  const parsed = AttemptRequestSchema.parse(input);
  const answer = parsePolynomial(parsed.expression);
  const expected = polynomialFromFunction(lesson.guidedPractice.function.coefficients, lesson.guidedPractice.function.evaluationPoint, parsed.stepId);
  const correct = polynomialEquals(answer, expected);
  const attempts = (parsed.learnerState.stepAttempts[parsed.stepId] ?? 0) + 1;
  const learnerState: LessonLearnerState = {
    ...parsed.learnerState,
    stepAttempts: { ...parsed.learnerState.stepAttempts, [parsed.stepId]: attempts },
    completedStepIds: correct ? Array.from(new Set([...parsed.learnerState.completedStepIds, parsed.stepId])) : parsed.learnerState.completedStepIds,
  };
  if (correct) return { correct: true, normalizedAnswer: formatPolynomial(answer), feedback: "This step is valid. Keep tracking h.", nextAction: "continue", learnerState };
  const code = MisconceptionCodeSchema.parse(classify(parsed.stepId, answer, lesson));
  learnerState.possibleMisconceptions = Array.from(new Set([...learnerState.possibleMisconceptions, code]));
  return { correct: false, normalizedAnswer: formatPolynomial(answer), misconceptionCode: code, feedback: feedback(code), nextAction: attempts >= 2 ? "play_remediation" : "retry", learnerState };
}

export function gradeTransfer(lesson: LessonSpec, expression: string) {
  const answer = parsePolynomial(expression);
  const expected = polynomialFromFunction(lesson.transferTask.function.coefficients, lesson.transferTask.function.evaluationPoint, "limit");
  return { correct: polynomialEquals(answer, expected), normalizedAnswer: formatPolynomial(answer) };
}
