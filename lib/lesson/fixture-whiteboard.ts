import { createHash } from "node:crypto";
import { LessonSpecV3Schema, type LessonSpecV3 } from "@/lib/lesson/schema";

export const WHITEBOARD_FIXTURE_LESSON_ID = "whiteboard-exponential-fixture";

// Offline demonstration lesson for the whiteboard runtime: exercises every
// element type and action of the DSL without any API key, audio, or renderer.
const segments: LessonSpecV3["segments"] = [
  {
    id: "hook", kind: "hook", title: "One growth engine",
    narration: "Here is a pattern that shows up in savings accounts, populations, and pandemics. Each step of growth is proportional to how much is already there. That single rule creates the fastest ordinary growth in mathematics.",
    transcript: "Growth proportional to current amount is the engine behind exponential explosion.",
    displayFormulas: [{ id: "hook-exp", katex: "f(x) = e^{x}", label: "the exponential function" }],
    scene: {
      elements: [
        { id: "title", type: "text", region: "title", x: null, y: null, content: "EXPONENTIAL GROWTH", size: "lg", color: "cyan" },
        { id: "subtitle", type: "text", region: "title", x: null, y: null, content: "the rule that outruns every straight line", size: "sm", color: "muted" },
        { id: "exp-formula", type: "formula", region: "main", x: 380, y: 250, katex: "f(x) = e^{x}", size: "lg", color: "ink" },
        { id: "rule-text", type: "text", region: "footer", x: null, y: null, content: "growth at every instant is proportional to what is already there", size: "md", color: "amber" },
        { id: "spotlight", type: "circle", cx: 480, cy: 250, r: 120, color: "violet" },
      ],
      actions: [
        { op: "appear", targetId: "title", toTargetId: null, toX: null, toY: null, durationMs: 900, anchor: { kind: "ratio", value: 0 } },
        { op: "appear", targetId: "subtitle", toTargetId: null, toX: null, toY: null, durationMs: 900, anchor: { kind: "ratio", value: 0.08 } },
        { op: "write", targetId: "exp-formula", toTargetId: null, toX: null, toY: null, durationMs: 1_600, anchor: { kind: "narration", text: "proportional to how much is already there" } },
        { op: "draw", targetId: "spotlight", toTargetId: null, toX: null, toY: null, durationMs: 1_400, anchor: { kind: "ratio", value: 0.55 } },
        { op: "highlight", targetId: "exp-formula", toTargetId: null, toX: null, toY: null, durationMs: 1_200, anchor: { kind: "ratio", value: 0.7 } },
        { op: "appear", targetId: "rule-text", toTargetId: null, toX: null, toY: null, durationMs: 1_000, anchor: { kind: "narration", text: "fastest ordinary growth" } },
      ],
    },
    checkpoint: null,
    learnerShouldNotice: ["Exponential growth means the rate is proportional to the current amount"],
    durationMs: 14_000,
  },
  {
    id: "curve", kind: "visualization", title: "Watch the curve",
    narration: "Watch the curve of the exponential function. Near the left it crawls, but every unit it moves right, its height multiplies by the same factor. The tangent line at any point has a slope equal to the height of the curve at that point.",
    transcript: "The exponential curve multiplies its height every unit step; tangent slope equals height.",
    displayFormulas: [{ id: "curve-exp", katex: "y = e^{x}", label: null }],
    scene: {
      elements: [
        { id: "frame", type: "axes", xMin: -1, xMax: 3, yMin: 0, yMax: 20, xLabel: "x", yLabel: "y" },
        { id: "exp-plot", type: "plot", expression: "exp(x)", xMin: -1, xMax: 3, color: "cyan", markPointAtX: 2 },
        { id: "start-point", type: "point", x: 0, y: 1, color: "amber", label: "start at 1" },
        { id: "tangent", type: "mathline", x1: 1.2, y1: 1.48, x2: 2.8, y2: 13.3, color: "amber", dashed: true },
        { id: "tangent-label", type: "label", targetId: "tangent", content: "slope = height here", placement: "right", color: "amber" },
        { id: "curve-formula", type: "formula", region: "left", x: 170, y: 130, katex: "y = e^{x}", size: "md", color: "ink" },
      ],
      actions: [
        { op: "appear", targetId: "frame", toTargetId: null, toX: null, toY: null, durationMs: 800, anchor: { kind: "ratio", value: 0 } },
        { op: "draw", targetId: "exp-plot", toTargetId: null, toX: null, toY: null, durationMs: 3_200, anchor: { kind: "narration", text: "Watch the curve" } },
        { op: "write", targetId: "curve-formula", toTargetId: null, toX: null, toY: null, durationMs: 1_200, anchor: { kind: "ratio", value: 0.22 } },
        { op: "appear", targetId: "start-point", toTargetId: null, toX: null, toY: null, durationMs: 800, anchor: { kind: "narration", text: "Near the left it crawls" } },
        { op: "move", targetId: "start-point", toTargetId: null, toX: 1, toY: 2.72, durationMs: 2_400, anchor: { kind: "narration", text: "every unit it moves right" } },
        { op: "draw", targetId: "tangent", toTargetId: null, toX: null, toY: null, durationMs: 1_600, anchor: { kind: "narration", text: "The tangent line" } },
        { op: "appear", targetId: "tangent-label", toTargetId: null, toX: null, toY: null, durationMs: 800, anchor: { kind: "narration", text: "slope equal to the height" } },
        { op: "pulse", targetId: "tangent", toTargetId: null, toX: null, toY: null, durationMs: 1_400, anchor: { kind: "ratio", value: 0.9 } },
      ],
    },
    checkpoint: null,
    learnerShouldNotice: ["Every unit step to the right multiplies the height by the same factor", "The tangent slope equals the height of the curve"],
    durationMs: 18_000,
  },
  {
    id: "signature", kind: "summary", title: "Its own derivative",
    narration: "This is the signature property. The derivative of the exponential function is the function itself, so its growth rate always matches its current size. That is why no straight line and no polynomial can keep up with it forever.",
    transcript: "d/dx e^x = e^x: the growth rate always equals the current value.",
    displayFormulas: [{ id: "sig-derivative", katex: "\\frac{d}{dx}\\, e^{x} = e^{x}", label: "the signature property" }],
    scene: {
      elements: [
        { id: "sig-title", type: "text", region: "title", x: null, y: null, content: "THE SIGNATURE PROPERTY", size: "lg", color: "cyan" },
        { id: "plain-exp", type: "formula", region: "main", x: 340, y: 230, katex: "e^{x}", size: "lg", color: "ink" },
        { id: "full-derivative", type: "formula", region: "main", x: 300, y: 230, katex: "\\frac{d}{dx}\\, e^{x} = e^{x}", size: "lg", color: "amber" },
        { id: "arrow-note", type: "arrow", x1: 300, y1: 400, x2: 460, y2: 310, color: "violet" },
        { id: "note", type: "text", region: "footer", x: null, y: null, content: "growth rate = current size, always", size: "md", color: "muted" },
      ],
      actions: [
        { op: "appear", targetId: "sig-title", toTargetId: null, toX: null, toY: null, durationMs: 900, anchor: { kind: "ratio", value: 0 } },
        { op: "write", targetId: "plain-exp", toTargetId: null, toX: null, toY: null, durationMs: 1_200, anchor: { kind: "narration", text: "signature property" } },
        { op: "morph", targetId: "plain-exp", toTargetId: "full-derivative", toX: null, toY: null, durationMs: 1_800, anchor: { kind: "narration", text: "derivative of the exponential function" } },
        { op: "draw", targetId: "arrow-note", toTargetId: null, toX: null, toY: null, durationMs: 1_000, anchor: { kind: "narration", text: "growth rate always matches" } },
        { op: "appear", targetId: "note", toTargetId: null, toX: null, toY: null, durationMs: 900, anchor: { kind: "ratio", value: 0.72 } },
        { op: "fadeOut", targetId: "arrow-note", toTargetId: null, toX: null, toY: null, durationMs: 900, anchor: { kind: "ratio", value: 0.93 } },
      ],
    },
    checkpoint: {
      id: "check-signature",
      prompt: "What makes the exponential function special among all functions?",
      options: [
        { id: "own-derivative", text: "Its growth rate always equals its current value" },
        { id: "fastest", text: "It is the fastest-growing function that exists" },
        { id: "starts-zero", text: "It starts at zero and accelerates from there" },
      ],
      correctIndex: 0,
      explanation: "The exponential function equals its own derivative, so at every point its growth rate matches its height. Other functions can be larger or steeper somewhere, but only the exponential keeps this exact balance everywhere — and e to the zero is one, not zero.",
    },
    learnerShouldNotice: ["The derivative of the exponential function is itself"],
    durationMs: 14_000,
  },
];

export const whiteboardFixtureLesson: LessonSpecV3 = LessonSpecV3Schema.parse({
  schemaVersion: 3,
  id: WHITEBOARD_FIXTURE_LESSON_ID,
  locale: "en",
  level: "secondary",
  objective: "See why exponential growth explodes: its growth rate always equals its current size.",
  sourceInput: "Why does exponential growth explode? (offline whiteboard fixture)",
  topic: "Exponential growth",
  storyHook: {
    setting: "A colony of bacteria doubling in a petri dish",
    task: "Understand why exponential growth explodes",
    consequence: "Linear thinking underestimates every explosive process",
  },
  segments,
  mathChecks: [
    { kind: "derivative_of", expression: "exp(x)", expected: "exp(x)", atX: null },
    { kind: "evaluates_to", expression: "exp(x)", expected: "1", atX: 0 },
  ],
  verification: { verdict: "approved", notes: [] },
  upgrade: { trackB: segments.map((segment) => ({ segmentId: segment.id, status: "failed" as const })) },
  assets: {
    segments: segments.map((segment) => ({
      segmentId: segment.id,
      videoUrl: null, audioUrl: null, posterUrl: null, captionsUrl: null, alignmentUrl: null,
      durationMs: segment.durationMs,
      checksum: createHash("sha256").update(`${segment.id}:${segment.transcript}`).digest("hex"),
      renderMode: "whiteboard" as const,
    })),
  },
});
