import { describe, expect, it } from "vitest";
import { buildDerivativeLesson, UnsupportedCalculusScopeError } from "@/lib/lesson/builder";
import { LessonSpecSchema } from "@/lib/lesson/schema";
import { seededDerivativeLesson } from "@/lib/lesson/seeded-derivative";

describe("calculus lesson contract", () => {
  it("contains exactly two checkpoints and one unassisted transfer", () => {
    expect(LessonSpecSchema.parse(seededDerivativeLesson).checkpoints).toHaveLength(2);
    expect(seededDerivativeLesson.transferTask.id).toBe("transfer");
    expect(seededDerivativeLesson.locale).toBe("en");
    expect(seededDerivativeLesson.assets.segments.every((asset) => asset.renderMode === "manim" && asset.videoUrl?.endsWith(".mp4"))).toBe(true);
    expect(seededDerivativeLesson.segments.reduce((sum, item) => sum + item.durationMs, 0)).toBeGreaterThanOrEqual(60_000);
    expect(seededDerivativeLesson.segments.reduce((sum, item) => sum + item.durationMs, 0)).toBeLessThanOrEqual(90_000);
  });

  it("extracts a supported cubic while keeping code-owned lesson templates", () => {
    const lesson = buildDerivativeLesson("Explain the derivative and instantaneous rate of change using f(x)=x^3-2x at x=1.", "en");
    expect(lesson.mathModel.coefficients).toEqual([0, -2, 0, 1]);
    expect(lesson.segments.every((segment) => segment.templateId.startsWith("derivative_"))).toBe(true);
    expect(lesson.segments.find((segment) => segment.id === "example")?.transcript).toContain("f′(1)=1");
    expect(lesson.assets.segments.every((asset) => asset.audioUrl === null)).toBe(true);
  });

  it("rejects unsupported topics instead of emitting generic content", () => {
    expect(() => buildDerivativeLesson("Explain Bayes' theorem and conditional probability.", "en")).toThrow(UnsupportedCalculusScopeError);
  });

  it("rejects explicit polynomials outside the reviewed renderer grammar", () => {
    expect(() => buildDerivativeLesson("Explain the derivative using f(x)=x^4 at x=1.", "en")).toThrow(UnsupportedCalculusScopeError);
    expect(() => buildDerivativeLesson("Explain the derivative using f(x)=alert(1) at x=1.", "en")).toThrow(UnsupportedCalculusScopeError);
  });
});
