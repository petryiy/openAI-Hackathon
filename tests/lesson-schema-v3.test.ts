import { describe, expect, it } from "vitest";
import { buildDerivativeLesson } from "@/lib/lesson/builder";
import { whiteboardFixtureLesson } from "@/lib/lesson/fixture-whiteboard";
import { LessonSpecSchema, LessonSpecV3Schema } from "@/lib/lesson/schema";
import { seededDerivativeLesson } from "@/lib/lesson/seeded-derivative";

describe("lesson schema v3", () => {
  it("roundtrips the fixture lesson through the union schema", () => {
    const parsed = LessonSpecSchema.parse(JSON.parse(JSON.stringify(whiteboardFixtureLesson)));
    expect(parsed.schemaVersion).toBe(3);
    if (parsed.schemaVersion !== 3) throw new Error("Expected a whiteboard lesson");
    expect(parsed.segments.length).toBeGreaterThanOrEqual(3);
    expect(parsed.assets.segments).toHaveLength(parsed.segments.length);
    expect(parsed.upgrade.trackB).toHaveLength(parsed.segments.length);
  });

  it("still parses the seeded v1 lesson after the union gained v3", () => {
    const parsed = LessonSpecSchema.parse(JSON.parse(JSON.stringify(seededDerivativeLesson)));
    expect(parsed.schemaVersion).toBe(1);
  });

  it("still parses a freshly built v2 lesson after the union gained v3", () => {
    const lesson = buildDerivativeLesson("Differentiate f(x)=(x^2+1)^3 and explain the chain rule.", "en");
    const parsed = LessonSpecSchema.parse(JSON.parse(JSON.stringify(lesson)));
    expect(parsed.schemaVersion).toBe(2);
  });

  it("parses v1 assets that predate the alignmentUrl field", () => {
    const raw = JSON.parse(JSON.stringify(seededDerivativeLesson)) as { assets: { segments: Record<string, unknown>[] } };
    for (const asset of raw.assets.segments) delete asset.alignmentUrl;
    expect(LessonSpecSchema.parse(raw).schemaVersion).toBe(1);
  });

  it("rejects mismatched assets, checkpoints, and narration markup", () => {
    const base = JSON.parse(JSON.stringify(whiteboardFixtureLesson));
    const missingAsset = JSON.parse(JSON.stringify(base));
    missingAsset.assets.segments.pop();
    expect(LessonSpecV3Schema.safeParse(missingAsset).success).toBe(false);

    const badCheckpoint = JSON.parse(JSON.stringify(base));
    badCheckpoint.segments[2].checkpoint.correctIndex = 9;
    expect(LessonSpecV3Schema.safeParse(badCheckpoint).success).toBe(false);

    const latexNarration = JSON.parse(JSON.stringify(base));
    latexNarration.segments[0].narration = "The derivative of \\frac{d}{dx} e^x equals itself which is remarkable and long enough.";
    expect(LessonSpecV3Schema.safeParse(latexNarration).success).toBe(false);

    const missingTrackB = JSON.parse(JSON.stringify(base));
    missingTrackB.upgrade.trackB = [];
    expect(LessonSpecV3Schema.safeParse(missingTrackB).success).toBe(false);
  });

  it("bounds segment count between 3 and 8", () => {
    const tooFew = JSON.parse(JSON.stringify(whiteboardFixtureLesson));
    tooFew.segments = tooFew.segments.slice(0, 2);
    tooFew.assets.segments = tooFew.assets.segments.slice(0, 2);
    tooFew.upgrade.trackB = tooFew.upgrade.trackB.slice(0, 2);
    expect(LessonSpecV3Schema.safeParse(tooFew).success).toBe(false);
  });
});
