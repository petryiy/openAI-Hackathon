import { describe, expect, it } from "vitest";
import { buildDerivativeLesson, UnsupportedCalculusScopeError } from "@/lib/lesson/builder";
import { LessonSpecSchema } from "@/lib/lesson/schema";
import { seededDerivativeLesson } from "@/lib/lesson/seeded-derivative";
import { CHAIN_RULE_SAMPLE } from "@/lib/lesson/constants";
import { SEEDED_CHAIN_RULE_LESSON_ID, seededChainRuleLesson } from "@/lib/lesson/seeded-chain-rule";

describe("calculus lesson contract", () => {
  it("contains exactly two checkpoints and one unassisted transfer", () => {
    const parsed = LessonSpecSchema.parse(seededDerivativeLesson);
    if (parsed.schemaVersion === 3) throw new Error("Expected a derivative lesson");
    expect(parsed.checkpoints).toHaveLength(2);
    expect(seededDerivativeLesson.transferTask.id).toBe("transfer");
    expect(seededDerivativeLesson.locale).toBe("en");
    expect(seededDerivativeLesson.assets.segments.every((asset) => asset.renderMode === "manim" && asset.videoUrl?.endsWith(".mp4"))).toBe(true);
    expect(seededDerivativeLesson.segments.reduce((sum, item) => sum + item.durationMs, 0)).toBeGreaterThanOrEqual(60_000);
    expect(seededDerivativeLesson.segments.reduce((sum, item) => sum + item.durationMs, 0)).toBeLessThanOrEqual(90_000);
  });

  it("ships the chain-rule mission as a complete offline Manim lesson", () => {
    const parsed = LessonSpecSchema.parse(seededChainRuleLesson);
    if (parsed.schemaVersion !== 2) throw new Error("Expected the chain-rule V2 lesson");
    expect(parsed.checkpoints).toHaveLength(2);
    expect(seededChainRuleLesson.id).toBe(SEEDED_CHAIN_RULE_LESSON_ID);
    expect(seededChainRuleLesson.schemaVersion).toBe(2);
    expect(seededChainRuleLesson.capability).toBe("chain");
    expect(seededChainRuleLesson.transferTask.id).toBe("transfer");
    expect(seededChainRuleLesson.assets.segments).toHaveLength(5);
    expect(seededChainRuleLesson.assets.segments.every((asset) =>
      asset.renderMode === "manim"
      && asset.videoUrl?.startsWith("/lesson-assets/chain-rule-seed/")
      && asset.audioUrl?.startsWith("/lesson-assets/chain-rule-seed/")
    )).toBe(true);
    expect(buildDerivativeLesson(CHAIN_RULE_SAMPLE, "en").id).toBe(SEEDED_CHAIN_RULE_LESSON_ID);
  });

  it("builds a versioned symbolic lesson while keeping code-owned lesson templates", () => {
    const lesson = buildDerivativeLesson("Explain the derivative and instantaneous rate of change using f(x)=x^3-2x at x=1.", "en");
    expect(lesson.schemaVersion).toBe(2);
    if (lesson.schemaVersion !== 2) throw new Error("Expected a symbolic lesson");
    expect(lesson.capability).toBe("sum");
    expect(lesson.segments.every((segment) => segment.templateId.startsWith("derivative_"))).toBe(true);
    expect(lesson.segments.find((segment) => segment.id === "example")?.transcript).toContain("f'(x)");
    expect(lesson.assets.segments.every((asset) => asset.audioUrl === null)).toBe(true);
  });

  it("rejects unsupported topics instead of emitting generic content", () => {
    expect(() => buildDerivativeLesson("Explain Bayes' theorem and conditional probability.", "en")).toThrow(UnsupportedCalculusScopeError);
  });

  it("supports bounded powers and rejects executable identifiers", () => {
    expect(buildDerivativeLesson("Explain the derivative using f(x)=x^4 at x=1.", "en").schemaVersion).toBe(2);
    expect(() => buildDerivativeLesson("Explain the derivative using f(x)=alert(1) at x=1.", "en")).toThrow(UnsupportedCalculusScopeError);
  });
});
