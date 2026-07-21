import { describe, expect, it } from "vitest";
import { sanitizeWhiteboardScene, validateWhiteboardScene, WhiteboardSceneSchema, type WhiteboardScene } from "@/lib/lesson/whiteboard-dsl";
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
