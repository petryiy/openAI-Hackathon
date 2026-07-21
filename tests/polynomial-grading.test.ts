import { describe, expect, it } from "vitest";
import { gradeAttempt, gradeTransfer } from "@/lib/lesson/grading";
import { createInitialLessonStates } from "@/lib/lesson/schema";
import { seededDerivativeLesson } from "@/lib/lesson/seeded-derivative";
import { formatPolynomial, parsePolynomial, polynomialEquals, polynomialFromFunction } from "@/lib/math/polynomial";

describe("restricted polynomial engine", () => {
  it("normalizes equivalent polynomial forms exactly", () => {
    expect(polynomialEquals(parsePolynomial("(2+h)^2+(2+h)"), parsePolynomial("6+5h+h^2"))).toBe(true);
    expect(formatPolynomial(parsePolynomial("(5h+h^2)/h"))).toBe("h + 5");
  });

  it("builds the four expected difference quotient stages", () => {
    const coefficients: [number, number, number, number] = [0, 1, 1, 0];
    expect(formatPolynomial(polynomialFromFunction(coefficients, 2, "substitute"))).toBe("h^2 + 5*h + 6");
    expect(formatPolynomial(polynomialFromFunction(coefficients, 2, "difference"))).toBe("h^2 + 5*h");
    expect(formatPolynomial(polynomialFromFunction(coefficients, 2, "quotient"))).toBe("h + 5");
    expect(formatPolynomial(polynomialFromFunction(coefficients, 2, "limit"))).toBe("5");
  });

  it.each(["process.exit()", "x^4", "1/(h+1)", "sin(x)", "x;alert(1)"])("rejects unsafe or unsupported input: %s", (input) => {
    expect(() => parsePolynomial(input)).toThrow();
  });
});

describe("deterministic lesson grading", () => {
  it("accepts every correct guided step", () => {
    let learnerState = createInitialLessonStates().learnerState;
    for (const [stepId, expression] of [["substitute", "h^2+5h+6"], ["difference", "h^2+5h"], ["quotient", "h+5"], ["limit", "5"]] as const) {
      const result = gradeAttempt(seededDerivativeLesson, { stepId, expression, learnerState });
      expect(result.correct).toBe(true); learnerState = result.learnerState;
    }
    expect(learnerState.completedStepIds).toHaveLength(4);
  });

  it("escalates a repeated error to targeted remediation", () => {
    const learnerState = createInitialLessonStates().learnerState;
    const first = gradeAttempt(seededDerivativeLesson, { stepId: "quotient", expression: "h^2+5h", learnerState });
    expect(first.misconceptionCode).toBe("DID_NOT_DIVIDE_BY_H");
    expect(first.nextAction).toBe("retry");
    const second = gradeAttempt(seededDerivativeLesson, { stepId: "quotient", expression: "h^2+5h", learnerState: first.learnerState });
    expect(second.nextAction).toBe("play_remediation");
  });

  it("grades transfer independently", () => {
    expect(gradeTransfer(seededDerivativeLesson, "1").correct).toBe(true);
    expect(gradeTransfer(seededDerivativeLesson, "-1").correct).toBe(false);
  });
});
