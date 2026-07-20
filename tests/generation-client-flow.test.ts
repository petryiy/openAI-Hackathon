import { describe, expect, it } from "vitest";
import { getGenerationStartDelay, getObservationDelay, isTransientGenerationError } from "@/lib/generation/client-flow";

describe("generation client flow", () => {
  it("backs polling off as a job ages", () => {
    expect(getObservationDelay(1_000)).toBe(750);
    expect(getObservationDelay(30_000)).toBe(1_500);
    expect(getObservationDelay(70_000)).toBe(3_000);
  });

  it("starts generation after the staged intro", () => {
    expect(getGenerationStartDelay("2026-01-01T00:00:00.000Z", Date.parse("2026-01-01T00:00:01.000Z"))).toBe(1_600);
    expect(getGenerationStartDelay("2026-01-01T00:00:00.000Z", Date.parse("2026-01-01T00:00:04.000Z"))).toBe(0);
  });

  it("classifies transient provider errors", () => {
    expect(isTransientGenerationError("OPENAI_RATE_LIMITED")).toBe(true);
    expect(isTransientGenerationError("OPENAI_AUTH_FAILED")).toBe(false);
  });
});
