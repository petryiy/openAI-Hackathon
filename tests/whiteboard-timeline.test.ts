import { describe, expect, it } from "vitest";
import { WhiteboardSceneSchema } from "@/lib/lesson/whiteboard-dsl";
import { compileTimeline, initiallyHiddenElementIds } from "@/lib/player/whiteboard-timeline";
import type { NarrationAlignment } from "@/lib/media/alignment";

const narration = "First the title appears. Then the curve grows across the graph.";

const scene = WhiteboardSceneSchema.parse({
  elements: [
    { id: "title", type: "text", region: "title", content: "GROWTH", size: "lg", color: "cyan" },
    { id: "frame", type: "axes", xMin: 0, xMax: 4, yMin: 0, yMax: 10 },
    { id: "curve", type: "plot", expression: "x^2", xMin: 0, xMax: 3, color: "cyan" },
    { id: "note", type: "text", region: "footer", content: "a note", size: "sm", color: "muted" },
  ],
  actions: [
    { op: "appear", targetId: "title", durationMs: 800, anchor: { kind: "ratio", value: 0 } },
    { op: "draw", targetId: "curve", durationMs: 3_000, anchor: { kind: "narration", text: "the curve grows" } },
    { op: "highlight", targetId: "title", durationMs: 1_000, anchor: { kind: "ratio", value: 0.1 } },
    { op: "fadeOut", targetId: "note", durationMs: 5_000, anchor: { kind: "ratio", value: 0.95 } },
  ],
});

function alignmentFor(text: string, msPerCharacter: number): NarrationAlignment {
  const characters = text.split("");
  return {
    original: {
      characters,
      startTimesMs: characters.map((_, index) => index * msPerCharacter),
      endTimesMs: characters.map((_, index) => (index + 1) * msPerCharacter),
    },
    normalized: null,
  };
}

describe("whiteboard timeline compiler", () => {
  it("resolves narration anchors through the character alignment", () => {
    const cues = compileTimeline(scene, narration, alignmentFor(narration, 50), 10_000);
    const drawCue = cues[1];
    expect(drawCue.startMs).toBe(narration.toLowerCase().indexOf("the curve grows") * 50);
  });

  it("falls back to proportional timing without an alignment", () => {
    const cues = compileTimeline(scene, narration, null, 10_000);
    const offset = narration.toLowerCase().indexOf("the curve grows");
    expect(cues[1].startMs).toBe(Math.round((offset / narration.length) * 10_000));
  });

  it("keeps cue starts non-decreasing even when anchors go backwards", () => {
    const cues = compileTimeline(scene, narration, alignmentFor(narration, 50), 10_000);
    // The highlight is anchored at 10% (1000ms) but the draw before it starts later.
    expect(cues[2].startMs).toBeGreaterThanOrEqual(cues[1].startMs);
    for (let index = 1; index < cues.length; index += 1) {
      expect(cues[index].startMs).toBeGreaterThanOrEqual(cues[index - 1].startMs);
    }
  });

  it("clamps every cue inside the segment duration", () => {
    const cues = compileTimeline(scene, narration, null, 6_000);
    for (const cue of cues) {
      expect(cue.startMs + cue.durationMs).toBeLessThanOrEqual(6_000);
      expect(cue.durationMs).toBeGreaterThanOrEqual(200);
    }
  });

  it("hides only elements whose first action is an entrance", () => {
    const hidden = initiallyHiddenElementIds(scene);
    expect(hidden.has("title")).toBe(true);
    expect(hidden.has("curve")).toBe(true);
    expect(hidden.has("note")).toBe(false);
    expect(hidden.has("frame")).toBe(false);
  });

  it("hides morph targets so they can crossfade in", () => {
    const morphScene = WhiteboardSceneSchema.parse({
      elements: [
        { id: "before", type: "formula", katex: "e^x", size: "lg", color: "ink" },
        { id: "after", type: "formula", katex: "e^x = e^x", size: "lg", color: "amber" },
      ],
      actions: [
        { op: "morph", targetId: "before", toTargetId: "after", durationMs: 1_500, anchor: { kind: "ratio", value: 0.4 } },
      ],
    });
    const hidden = initiallyHiddenElementIds(morphScene);
    expect(hidden.has("after")).toBe(true);
    expect(hidden.has("before")).toBe(false);
  });
});
