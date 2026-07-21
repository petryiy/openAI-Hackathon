import { describe, expect, it } from "vitest";
import { buildDerivativeLesson, UnsupportedCalculusScopeError } from "@/lib/lesson/builder";
import { gradeAttempt, gradeTransfer } from "@/lib/lesson/grading";
import { createInitialLessonStates } from "@/lib/lesson/schema";
import { differentiate, expressionsEquivalent, formatExpression, parseMathExpression } from "@/lib/math/expression";

describe("restricted symbolic derivative grammar", () => {
  it("normalizes Unicode, implicit multiplication, and standard functions", () => {
    const source = parseMathExpression("3(x²+1) + sin(2x)");
    expect(formatExpression(source)).toContain("sin(2*x)");
    expect(expressionsEquivalent(differentiate(parseMathExpression("(x^2+1)^3")), parseMathExpression("6*x*(x^2+1)^2"))).toBe(true);
  });

  it.each([
    ["Differentiate f(x)=(x^2+1)^3 and explain the chain rule.", "chain"],
    ["Differentiate f(x)=x^2*sin(x) using the product rule.", "product"],
    ["Differentiate f(x)=(x^2+1)/(x-1) using the quotient rule.", "quotient"],
    ["Differentiate f(x)=sin(x).", "standard_function"],
    ["Differentiate f(x)=x^4.", "power"],
  ] as const)("builds a deterministic %s lesson", (input, capability) => {
    const lesson = buildDerivativeLesson(input, "en");
    expect(lesson.schemaVersion).toBe(2);
    if (lesson.schemaVersion !== 2) throw new Error("Expected V2");
    expect(lesson.capability).toBe(capability);
    expect(lesson.checkpoints).toHaveLength(2);
    expect(lesson.guidedPractice.steps).toHaveLength(4);
    expect(lesson.segments).toHaveLength(5);
  });

  it("grades named chain-rule fields and detects a missing inner derivative", () => {
    const lesson = buildDerivativeLesson("Differentiate f(x)=(x^2+1)^3 and explain the chain rule.", "en");
    if (lesson.schemaVersion !== 2) throw new Error("Expected V2");
    const learnerState = createInitialLessonStates().learnerState;
    const correct = gradeAttempt(lesson, { stepId: "differentiate-parts", responses: { "inner-prime": "2x" }, learnerState });
    expect(correct.correct).toBe(true);
    const first = gradeAttempt(lesson, { stepId: "assemble", responses: { assembled: "3*(x^2+1)^2" }, learnerState: correct.learnerState });
    const second = gradeAttempt(lesson, { stepId: "assemble", responses: { assembled: "3*(x^2+1)^2" }, learnerState: first.learnerState });
    expect(second.misconceptionCode).toBe("MISSING_INNER_DERIVATIVE");
    expect(second.nextAction).toBe("play_remediation");
  });

  it("groups constants and extra terms into two bounded practice fields", () => {
    const product = buildDerivativeLesson("Differentiate f(x)=2x*sin(x) using the product rule.", "en");
    const sum = buildDerivativeLesson("Differentiate f(x)=x^3+x^2+x.", "en");
    if (product.schemaVersion !== 2 || sum.schemaVersion !== 2) throw new Error("Expected V2");
    expect(product.guidedPractice.steps[0].fields).toHaveLength(2);
    expect(sum.guidedPractice.steps[0].fields).toHaveLength(2);
  });

  it("grades a different unassisted chain-rule transfer", () => {
    const lesson = buildDerivativeLesson("Differentiate f(x)=(x^2+1)^3 and explain the chain rule.", "en");
    expect(gradeTransfer(lesson, "4x*(x^2+2)").correct).toBe(true);
  });

  it("evaluates a requested point only after assembling the derivative", () => {
    const lesson = buildDerivativeLesson("Find the slope of f(x)=(x^2+1)^3 at x=1.", "en");
    if (lesson.schemaVersion !== 2) throw new Error("Expected V2");
    expect(lesson.mathModel.task).toBe("slope_at_point");
    expect(lesson.guidedPractice.steps[3].fields[0].expected).toEqual(parseMathExpression("24"));
    expect(() => buildDerivativeLesson("Find the slope of f(x)=ln(x) at x=-1.", "en")).toThrow(UnsupportedCalculusScopeError);
  });

  it("rejects unsupported and unsafe expressions", () => {
    expect(() => buildDerivativeLesson("Find the integral of x^2.", "en")).toThrow(UnsupportedCalculusScopeError);
    expect(() => buildDerivativeLesson("Differentiate f(x)=alert(1).", "en")).toThrow(UnsupportedCalculusScopeError);
    expect(() => parseMathExpression("x^x")).toThrow();
    expect(() => parseMathExpression("sin(sin(sin(x)))")).toThrow();
  });
});
