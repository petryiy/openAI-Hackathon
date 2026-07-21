import { describe, expect, it } from "vitest";
import { dropUnrenderableElements, sanitizeWhiteboardScene, validateWhiteboardScene, WhiteboardSceneSchema, type WhiteboardScene } from "@/lib/lesson/whiteboard-dsl";
import { whiteboardFixtureLesson } from "@/lib/lesson/fixture-whiteboard";

const narration = "Watch the curve rise as we move to the right of the graph.";

function scene(overrides: Partial<WhiteboardScene>): WhiteboardScene {
  return WhiteboardSceneSchema.parse({
    elements: [
      { id: "frame", type: "axes", xMin: -2, xMax: 2, yMin: -1, yMax: 4 },
      { id: "curve", type: "plot", expression: "x^2", xMin: -2, xMax: 2, color: "cyan" },
    ],
    actions: [
      { op: "draw", targetId: "curve", durationMs: 2_000, anchor: { kind: "narration", text: "Watch the curve" } },
    ],
    ...overrides,
  });
}

describe("whiteboard DSL validation", () => {
  it("accepts every scene in the committed fixture lesson", () => {
    for (const segment of whiteboardFixtureLesson.segments) {
      expect(validateWhiteboardScene(segment.scene, segment.narration)).toEqual([]);
    }
  });

  it("rejects a plot expression outside the supported grammar", () => {
    const problems = validateWhiteboardScene(scene({
      elements: [
        { id: "frame", type: "axes", xMin: -2, xMax: 2, yMin: -1, yMax: 4 },
        { id: "curve", type: "plot", expression: "tan(x)", xMin: -2, xMax: 2, color: "cyan" },
      ],
    }), narration);
    expect(problems.some((problem) => problem.includes("supported grammar"))).toBe(true);
  });

  it("rejects math elements without an axes element", () => {
    const problems = validateWhiteboardScene(scene({
      elements: [{ id: "curve", type: "plot", expression: "x^2", xMin: -2, xMax: 2, color: "cyan" }],
    }), narration);
    expect(problems.some((problem) => problem.includes("require exactly one axes"))).toBe(true);
  });

  it("rejects anchors that do not quote the narration", () => {
    const problems = validateWhiteboardScene(scene({
      actions: [{ op: "draw", targetId: "curve", durationMs: 2_000, anchor: { kind: "narration", text: "a phrase nobody said" } }],
    }), narration);
    expect(problems.some((problem) => problem.includes("not a phrase from the narration"))).toBe(true);
  });

  it("rejects actions that target missing elements and invalid morphs", () => {
    const problems = validateWhiteboardScene(scene({
      actions: [
        { op: "appear", targetId: "ghost", durationMs: 800, anchor: { kind: "ratio", value: 0 } },
        { op: "morph", targetId: "curve", toTargetId: "frame", durationMs: 800, anchor: { kind: "ratio", value: 0.5 } },
      ],
    }), narration);
    expect(problems.some((problem) => problem.includes("missing element \"ghost\""))).toBe(true);
    expect(problems.some((problem) => problem.includes("morph"))).toBe(true);
  });

  it("rejects moves without a destination and moves of plots", () => {
    const problems = validateWhiteboardScene(scene({
      actions: [{ op: "move", targetId: "curve", durationMs: 800, anchor: { kind: "ratio", value: 0.2 } }],
    }), narration);
    expect(problems.some((problem) => problem.includes("needs toX"))).toBe(true);
    expect(problems.some((problem) => problem.includes("cannot move a plot"))).toBe(true);
  });

  it("rejects broken KaTeX in formula elements", () => {
    const problems = validateWhiteboardScene(scene({
      elements: [{ id: "bad", type: "formula", katex: "\\frac{1}", size: "md", color: "ink" }],
      actions: [{ op: "appear", targetId: "bad", durationMs: 800, anchor: { kind: "ratio", value: 0 } }],
    }), narration);
    expect(problems.some((problem) => problem.includes("KaTeX"))).toBe(true);
  });

  it("sanitizes a scene by synthesizing a missing axes for math elements", () => {
    const raw = WhiteboardSceneSchema.parse({
      elements: [{ id: "curve", type: "plot", expression: "x^2", xMin: -2, xMax: 2, color: "cyan" }],
      actions: [{ op: "draw", targetId: "curve", durationMs: 2_000, anchor: { kind: "ratio", value: 0 } }],
    });
    const sanitized = sanitizeWhiteboardScene(raw, "watch it");
    expect(sanitized.elements.some((element) => element.type === "axes")).toBe(true);
    expect(validateWhiteboardScene(sanitized, "watch it")).toEqual([]);
  });

  it("sanitizes dangling action and label references instead of failing", () => {
    const raw = WhiteboardSceneSchema.parse({
      elements: [
        { id: "title", type: "text", content: "hi", size: "lg", color: "cyan" },
        { id: "orphan-label", type: "label", targetId: "ghost", content: "x", placement: "above", color: "ink" },
      ],
      actions: [
        { op: "appear", targetId: "title", durationMs: 800, anchor: { kind: "ratio", value: 0 } },
        { op: "write", targetId: "ghost", durationMs: 800, anchor: { kind: "ratio", value: 0.5 } },
      ],
    });
    const sanitized = sanitizeWhiteboardScene(raw, "hi there");
    expect(sanitized.elements.some((element) => element.id === "orphan-label")).toBe(false);
    expect(sanitized.actions.some((action) => action.targetId === "ghost")).toBe(false);
    expect(validateWhiteboardScene(sanitized, "hi there")).toEqual([]);
  });

  it("merges multiple axes into one frame that covers every math element", () => {
    const raw = WhiteboardSceneSchema.parse({
      elements: [
        { id: "frame-a", type: "axes", xMin: 0, xMax: 1, yMin: 0, yMax: 1, xLabel: "p", yLabel: "q" },
        { id: "frame-b", type: "axes", xMin: -3, xMax: 3, yMin: -2, yMax: 9 },
        { id: "curve", type: "plot", expression: "x^2", xMin: -3, xMax: 3, color: "cyan" },
      ],
      actions: [
        { op: "appear", targetId: "frame-a", durationMs: 700, anchor: { kind: "ratio", value: 0 } },
        { op: "appear", targetId: "frame-b", durationMs: 700, anchor: { kind: "ratio", value: 0.1 } },
        { op: "draw", targetId: "curve", durationMs: 2_000, anchor: { kind: "ratio", value: 0.3 } },
      ],
    });
    const sanitized = sanitizeWhiteboardScene(raw, "two graphs become one");
    const axes = sanitized.elements.filter((element) => element.type === "axes");
    expect(axes).toHaveLength(1);
    if (axes[0].type !== "axes") throw new Error("expected axes");
    // The surviving frame must cover both original ranges and the plot.
    expect(axes[0].xMin).toBeLessThanOrEqual(-3);
    expect(axes[0].xMax).toBeGreaterThanOrEqual(3);
    expect(axes[0].yMax).toBeGreaterThanOrEqual(9);
    // Actions that addressed the dropped axes are retargeted, not lost.
    expect(sanitized.actions.every((action) => action.targetId !== "frame-b")).toBe(true);
    expect(sanitized.actions).toHaveLength(3);
    expect(validateWhiteboardScene(sanitized, "two graphs become one")).toEqual([]);
  });

  it("renames duplicate element ids and repairs reversed ranges", () => {
    const raw = WhiteboardSceneSchema.parse({
      elements: [
        { id: "frame", type: "axes", xMin: 4, xMax: -4, yMin: 5, yMax: -5 },
        { id: "note", type: "text", content: "first", size: "md", color: "ink" },
        { id: "note", type: "text", content: "second", size: "md", color: "amber" },
      ],
      actions: [{ op: "appear", targetId: "note", durationMs: 800, anchor: { kind: "ratio", value: 0 } }],
    });
    const sanitized = sanitizeWhiteboardScene(raw, "any words");
    const ids = sanitized.elements.map((element) => element.id);
    expect(new Set(ids).size).toBe(ids.length);
    const frame = sanitized.elements.find((element) => element.type === "axes");
    if (frame?.type !== "axes") throw new Error("expected axes");
    expect(frame.xMin).toBeLessThan(frame.xMax);
    expect(frame.yMin).toBeLessThan(frame.yMax);
    expect(validateWhiteboardScene(sanitized, "any words")).toEqual([]);
  });

  it("downgrades unusable move and morph actions instead of failing", () => {
    const raw = WhiteboardSceneSchema.parse({
      elements: [
        { id: "frame", type: "axes", xMin: -2, xMax: 2, yMin: -1, yMax: 4 },
        { id: "curve", type: "plot", expression: "x^2", xMin: -2, xMax: 2, color: "cyan" },
        { id: "note", type: "text", content: "hello", size: "md", color: "ink" },
      ],
      actions: [
        { op: "move", targetId: "curve", toX: 1, durationMs: 900, anchor: { kind: "ratio", value: 0.2 } },
        { op: "move", targetId: "note", durationMs: 900, anchor: { kind: "ratio", value: 0.4 } },
        { op: "morph", targetId: "note", toTargetId: "curve", durationMs: 900, anchor: { kind: "ratio", value: 0.6 } },
      ],
    });
    const sanitized = sanitizeWhiteboardScene(raw, "any words");
    expect(sanitized.actions).toHaveLength(3);
    expect(sanitized.actions.every((action) => action.op !== "move" && action.op !== "morph")).toBe(true);
    expect(validateWhiteboardScene(sanitized, "any words")).toEqual([]);
  });

  it("rescues a scene by dropping unrenderable plots and formulas", () => {
    const raw = WhiteboardSceneSchema.parse({
      elements: [
        { id: "frame", type: "axes", xMin: -2, xMax: 2, yMin: -4, yMax: 4 },
        { id: "bad-curve", type: "plot", expression: "tan(x)", xMin: -2, xMax: 2, color: "cyan" },
        { id: "good-curve", type: "plot", expression: "sin(x)", xMin: -2, xMax: 2, color: "amber" },
        { id: "bad-eq", type: "formula", katex: "\\frac{1}", size: "md", color: "ink" },
        { id: "title", type: "text", content: "waves", size: "lg", color: "cyan" },
      ],
      actions: [
        { op: "draw", targetId: "bad-curve", durationMs: 2_000, anchor: { kind: "ratio", value: 0 } },
        { op: "draw", targetId: "good-curve", durationMs: 2_000, anchor: { kind: "ratio", value: 0.3 } },
        { op: "write", targetId: "bad-eq", durationMs: 1_000, anchor: { kind: "ratio", value: 0.6 } },
      ],
    });
    expect(validateWhiteboardScene(raw, "waves").length).toBeGreaterThan(0);
    const rescued = dropUnrenderableElements(raw, "waves");
    expect(rescued.elements.some((element) => element.id === "bad-curve")).toBe(false);
    expect(rescued.elements.some((element) => element.id === "bad-eq")).toBe(false);
    expect(rescued.elements.some((element) => element.id === "good-curve")).toBe(true);
    expect(validateWhiteboardScene(rescued, "waves")).toEqual([]);
  });

  it("terminates and stays unique when deduping ids at the 40-character cap", () => {
    const longId = "a".repeat(40);
    const raw = WhiteboardSceneSchema.parse({
      elements: [
        { id: longId, type: "text", content: "first", size: "md", color: "ink" },
        { id: longId, type: "text", content: "second", size: "md", color: "amber" },
        { id: longId, type: "text", content: "third", size: "md", color: "cyan" },
      ],
      actions: [{ op: "appear", targetId: longId, durationMs: 800, anchor: { kind: "ratio", value: 0 } }],
    });
    const sanitized = sanitizeWhiteboardScene(raw, "any words");
    const ids = sanitized.elements.map((element) => element.id);
    expect(new Set(ids).size).toBe(3);
    expect(ids.every((id) => id.length <= 40)).toBe(true);
    expect(validateWhiteboardScene(sanitized, "any words")).toEqual([]);
  });

  it("clamps merged and synthesized axes to the schema coordinate bounds", () => {
    const steep = WhiteboardSceneSchema.parse({
      elements: [
        { id: "frame-a", type: "axes", xMin: 0, xMax: 1, yMin: 0, yMax: 1 },
        { id: "frame-b", type: "axes", xMin: 0, xMax: 10, yMin: 0, yMax: 10 },
        { id: "steep", type: "plot", expression: "exp(x)", xMin: 0, xMax: 10, color: "cyan" },
      ],
      actions: [{ op: "draw", targetId: "steep", durationMs: 2_000, anchor: { kind: "ratio", value: 0 } }],
    });
    const sanitized = sanitizeWhiteboardScene(steep, "it grows fast");
    expect(validateWhiteboardScene(sanitized, "it grows fast")).toEqual([]);

    const boundaryPoint = WhiteboardSceneSchema.parse({
      elements: [{ id: "top", type: "point", x: 0, y: 1_000, color: "amber" }],
      actions: [{ op: "appear", targetId: "top", durationMs: 800, anchor: { kind: "ratio", value: 0 } }],
    });
    expect(() => sanitizeWhiteboardScene(boundaryPoint, "way up high")).not.toThrow();
    expect(() => dropUnrenderableElements(boundaryPoint, "way up high")).not.toThrow();
  });

  it("repairs a degenerate range at the coordinate boundary without overflowing", () => {
    const raw = WhiteboardSceneSchema.parse({
      elements: [
        { id: "frame", type: "axes", xMin: 1_000, xMax: 1_000, yMin: -1_000, yMax: -1_000 },
        { id: "note", type: "text", content: "edge", size: "md", color: "ink" },
      ],
      actions: [{ op: "appear", targetId: "note", durationMs: 800, anchor: { kind: "ratio", value: 0 } }],
    });
    const sanitized = sanitizeWhiteboardScene(raw, "any words");
    const frame = sanitized.elements.find((element) => element.type === "axes");
    if (frame?.type !== "axes") throw new Error("expected axes");
    expect(frame.xMin).toBeLessThan(frame.xMax);
    expect(frame.xMax).toBeLessThanOrEqual(1_000);
    expect(frame.yMin).toBeGreaterThanOrEqual(-1_000);
    expect(validateWhiteboardScene(sanitized, "any words")).toEqual([]);
  });

  it("makes room for a synthesized axes in a full 12-element scene", () => {
    const fillers = Array.from({ length: 11 }, (_, index) => ({
      id: `note-${index}`, type: "text" as const, content: `note ${index}`, size: "sm" as const, color: "ink" as const,
    }));
    const raw = WhiteboardSceneSchema.parse({
      elements: [...fillers, { id: "curve", type: "plot", expression: "x^2", xMin: -2, xMax: 2, color: "cyan" }],
      actions: [{ op: "draw", targetId: "curve", durationMs: 2_000, anchor: { kind: "ratio", value: 0 } }],
    });
    expect(raw.elements).toHaveLength(12);
    const sanitized = sanitizeWhiteboardScene(raw, "watch the curve");
    expect(sanitized.elements.some((element) => element.type === "axes")).toBe(true);
    expect(sanitized.elements.some((element) => element.id === "curve")).toBe(true);
    expect(sanitized.elements.length).toBeLessThanOrEqual(12);
    expect(validateWhiteboardScene(sanitized, "watch the curve")).toEqual([]);
  });

  it("rescues a scene whose only survivor would be an orphaned label", () => {
    const raw = WhiteboardSceneSchema.parse({
      elements: [
        { id: "bad-eq", type: "formula", katex: "\\frac{1}", size: "md", color: "ink" },
        { id: "eq-label", type: "label", targetId: "bad-eq", content: "the key formula", placement: "above", color: "amber" },
      ],
      actions: [{ op: "write", targetId: "bad-eq", durationMs: 1_000, anchor: { kind: "ratio", value: 0 } }],
    });
    const rescued = dropUnrenderableElements(raw, "listen closely");
    expect(rescued.elements.length).toBeGreaterThan(0);
    expect(rescued.actions.length).toBeGreaterThan(0);
    expect(validateWhiteboardScene(rescued, "listen closely")).toEqual([]);
  });

  it("rescues a scene even when nothing renderable remains", () => {
    const raw = WhiteboardSceneSchema.parse({
      elements: [{ id: "bad-eq", type: "formula", katex: "\\frac{1}", size: "md", color: "ink" }],
      actions: [{ op: "write", targetId: "bad-eq", durationMs: 1_000, anchor: { kind: "ratio", value: 0 } }],
    });
    const rescued = dropUnrenderableElements(raw, "listen closely");
    expect(rescued.elements.length).toBeGreaterThan(0);
    expect(rescued.actions.length).toBeGreaterThan(0);
    expect(validateWhiteboardScene(rescued, "listen closely")).toEqual([]);
  });

  it("downgrades an unmatched narration anchor to a proportional cue", () => {
    const raw = WhiteboardSceneSchema.parse({
      elements: [{ id: "title", type: "text", content: "hi", size: "lg", color: "cyan" }],
      actions: [{ op: "appear", targetId: "title", durationMs: 800, anchor: { kind: "narration", text: "never said this" } }],
    });
    const sanitized = sanitizeWhiteboardScene(raw, "hello world");
    expect(sanitized.actions[0].anchor.kind).toBe("ratio");
    expect(validateWhiteboardScene(sanitized, "hello world")).toEqual([]);
  });

  it("leaves the committed fixture scenes unchanged when sanitizing", () => {
    for (const segment of whiteboardFixtureLesson.segments) {
      const sanitized = sanitizeWhiteboardScene(segment.scene, segment.narration);
      expect(sanitized.elements).toHaveLength(segment.scene.elements.length);
      expect(sanitized.actions).toHaveLength(segment.scene.actions.length);
    }
  });

  it("enforces the element and action caps at the schema level", () => {
    const manyElements = Array.from({ length: 13 }, (_, index) => ({
      id: `text-${index}`, type: "text", content: "hello", size: "sm", color: "ink",
    }));
    expect(WhiteboardSceneSchema.safeParse({
      elements: manyElements,
      actions: [{ op: "appear", targetId: "text-0", durationMs: 500, anchor: { kind: "ratio", value: 0 } }],
    }).success).toBe(false);
    const manyActions = Array.from({ length: 21 }, () => ({
      op: "appear", targetId: "one", durationMs: 500, anchor: { kind: "ratio", value: 0 },
    }));
    expect(WhiteboardSceneSchema.safeParse({
      elements: [{ id: "one", type: "text", content: "hello", size: "sm", color: "ink" }],
      actions: manyActions,
    }).success).toBe(false);
  });
});
