import { describe, expect, it } from "vitest";
import { applyDerivativeLanguagePlan, DerivativeLanguagePlanSchema } from "@/lib/ai/lesson-provider";
import { buildDerivativeLesson } from "@/lib/lesson/builder";

const safePlan = {
  setting: "A quiet orbital guidance room before a course correction",
  task: "Keep the probe aligned while its path changes",
  consequence: "A skipped relationship sends the prediction away from the safe corridor",
  bridges: [
    { segmentId: "hook", text: "The guidance window is closing, so structure matters." },
    { segmentId: "structure", text: "First inspect how the moving parts fit together." },
    { segmentId: "rule", text: "Now preserve every relationship during the transformation." },
    { segmentId: "example", text: "The navigation trace makes each decision visible." },
    { segmentId: "summary", text: "The same structural habit now moves to a fresh case." },
  ],
} as const;

describe("derivative language planner boundary", () => {
  it("allows narrative bridges without changing verified mathematics", () => {
    const lesson = buildDerivativeLesson("Differentiate f(x)=(x^2+1)^3 and explain the chain rule.", "en");
    if (lesson.schemaVersion !== 2) throw new Error("Expected V2");
    const personalized = applyDerivativeLanguagePlan(lesson, DerivativeLanguagePlanSchema.parse(safePlan));
    expect(personalized.mathModel).toEqual(lesson.mathModel);
    expect(personalized.guidedPractice).toEqual(lesson.guidedPractice);
    expect(personalized.segments[0].narration).toContain("guidance window");
  });

  it("rejects formulas, numbers, markup, and unknown fields in model bridges", () => {
    const lesson = buildDerivativeLesson("Differentiate f(x)=(x^2+1)^3 and explain the chain rule.", "en");
    if (lesson.schemaVersion !== 2) throw new Error("Expected V2");
    const unsafe = DerivativeLanguagePlanSchema.parse({ ...safePlan, bridges: safePlan.bridges.map((bridge, index) => index ? bridge : { ...bridge, text: "Use f'(x)=6x now." }) });
    expect(() => applyDerivativeLanguagePlan(lesson, unsafe)).toThrow("may not introduce formulas");
    expect(DerivativeLanguagePlanSchema.safeParse({ ...safePlan, python: "print('unsafe')" }).success).toBe(false);
  });
});
