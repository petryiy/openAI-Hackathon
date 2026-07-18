import { describe, expect, it } from "vitest";
import type { EpisodeSpec } from "@/lib/episode/schema";
import { formatPercent, parseProbabilityMetrics } from "@/lib/episode/visual-metrics";

function probabilityVisual(labels: string[]): EpisodeSpec["visualizations"][number] {
  return {
    id: "probability-visual",
    conceptIds: ["conditional-probability"],
    type: "spatial_model",
    learningPurpose: "Compare true and false positives in a 1000-person model.",
    learnerShouldNotice: ["The healthy base can create more false positives."],
    concreteRepresentation: "SVG 1000-person grid",
    abstractRepresentation: "PPV=TP/(TP+FP)",
    variablesOrLabels: labels,
    visualEncoding: { emphasis: ["positive pool"], colorMeaning: {}, motionMeaning: {} },
    renderer: "svg",
    placement: "focus_mode",
    trigger: "core",
    narration: "Count both routes into the positive pool.",
    checkForUnderstanding: null,
    deterministicFallback: "Static SVG grid and fraction.",
  };
}

describe("probability visualization metrics", () => {
  it("derives a self-consistent 1000-person model from prevalence and test rates", () => {
    const metrics = parseProbabilityMetrics(probabilityVisual(["p=1%", "Se=95%", "Sp=95%"]));
    expect(metrics).not.toBeNull();
    expect(metrics?.truePositive).toBeCloseTo(9.5);
    expect(metrics?.falsePositive).toBeCloseTo(49.5);
    expect(formatPercent(metrics?.positivePredictiveValue ?? 0)).toBe("16.1%");
  });

  it("updates the same model when only the base rate changes", () => {
    const metrics = parseProbabilityMetrics(probabilityVisual(["p=10%", "Se=95%", "Sp=95%"]));
    expect(metrics?.truePositive).toBeCloseTo(95);
    expect(metrics?.falsePositive).toBeCloseTo(45);
    expect(formatPercent(metrics?.positivePredictiveValue ?? 0)).toBe("67.9%");
  });
});
