import { describe, expect, it } from "vitest";
import { collectDraftProblems, modelLessonToV3, rescueDraft, runMathChecks } from "@/lib/ai/generic-lesson-provider";
import { LessonSpecV3Schema } from "@/lib/lesson/schema";
import { whiteboardFixtureLesson } from "@/lib/lesson/fixture-whiteboard";

// A minimal valid model draft (no lesson id / assets — those are code-assigned).
function modelDraft() {
  return {
    objective: "Understand why a linear function has a constant slope.",
    topic: "Linear functions",
    storyHook: { setting: "A ramp in a skate park", task: "Predict the height at any point", consequence: "Guessing the slope wrong wrecks the jump" },
    segments: [
      {
        id: "hook", kind: "hook" as const, title: "A straight ramp",
        narration: "A straight ramp climbs by the same amount every step you take along it. That steady climb is what we call a constant slope.",
        transcript: "A line climbs by the same amount each step: constant slope.",
        displayFormulas: [{ id: "line", katex: "y = 2x", label: null }],
        scene: {
          elements: [
            { id: "frame", type: "axes" as const, xMin: -1, xMax: 4, yMin: -1, yMax: 8, xLabel: "x", yLabel: "y" },
            { id: "ramp", type: "plot" as const, expression: "2*x", xMin: -1, xMax: 4, color: "cyan" as const, markPointAtX: null },
          ],
          actions: [
            { op: "draw" as const, targetId: "ramp", toTargetId: null, toX: null, toY: null, durationMs: 2_000, anchor: { kind: "narration" as const, text: "A straight ramp climbs" } },
          ],
        },
        checkpoint: null,
        learnerShouldNotice: ["A line rises by the same amount for every step in x"],
        durationMs: 12_000,
      },
      {
        id: "why", kind: "concept" as const, title: "Why it stays constant",
        narration: "No matter where you stand on the line, moving one unit to the right always lifts you by the same fixed amount. That fixed amount is the slope.",
        transcript: "Every unit step right lifts you by the same fixed amount.",
        displayFormulas: [{ id: "slope", katex: "m = 2", label: "the slope" }],
        scene: {
          elements: [{ id: "note", type: "text" as const, region: "main" as const, x: null, y: null, content: "same step, same rise", size: "lg" as const, color: "amber" as const }],
          actions: [{ op: "appear" as const, targetId: "note", toTargetId: null, toX: null, toY: null, durationMs: 900, anchor: { kind: "ratio" as const, value: 0.2 } }],
        },
        checkpoint: {
          id: "check-slope", prompt: "What does the slope of a line tell you?",
          options: [{ id: "a", text: "How much y changes per unit of x" }, { id: "b", text: "Where the line crosses zero" }],
          correctIndex: 0, explanation: "Slope is the constant rise per unit run, the same everywhere on a straight line.",
        },
        learnerShouldNotice: ["Slope is the constant rise per unit run"],
        durationMs: 13_000,
      },
      {
        id: "recap", kind: "summary" as const, title: "Putting it together",
        narration: "So a line is the one shape whose steepness never changes, which is exactly why a single number, the slope, describes the whole thing.",
        transcript: "A line's steepness never changes, so one slope number describes it.",
        displayFormulas: [],
        scene: {
          elements: [{ id: "done", type: "text" as const, region: "title" as const, x: null, y: null, content: "ONE NUMBER, WHOLE LINE", size: "lg" as const, color: "cyan" as const }],
          actions: [{ op: "write" as const, targetId: "done", toTargetId: null, toX: null, toY: null, durationMs: 1_200, anchor: { kind: "narration" as const, text: "a single number" } }],
        },
        checkpoint: null,
        learnerShouldNotice: ["A line has one slope that describes it everywhere"],
        durationMs: 11_000,
      },
    ],
    mathChecks: [
      { kind: "evaluates_to" as const, expression: "2*x", expected: "4", atX: 2 },
      { kind: "derivative_of" as const, expression: "x^2", expected: "2*x", atX: null },
    ],
  };
}

describe("generic lesson provider", () => {
  it("normalizes a model draft into a valid v3 lesson", () => {
    const lesson = modelLessonToV3(modelDraft(), { sourceInput: "why is a line's slope constant", level: "secondary", lessonId: "abc123" });
    expect(() => LessonSpecV3Schema.parse(lesson)).not.toThrow();
    expect(lesson.id).toBe("abc123");
    expect(lesson.assets.segments).toHaveLength(3);
    expect(lesson.upgrade.trackB.every((entry) => entry.status === "pending")).toBe(true);
    expect(lesson.assets.segments.every((asset) => asset.renderMode === "whiteboard")).toBe(true);
  });

  it("estimates each segment duration from its narration length", () => {
    const lesson = modelLessonToV3(modelDraft(), { sourceInput: "x", level: "secondary", lessonId: "dur1" });
    for (const segment of lesson.segments) {
      expect(segment.durationMs).toBeGreaterThanOrEqual(6_000);
      expect(segment.durationMs).toBeLessThanOrEqual(90_000);
    }
  });

  it("reports DSL problems so a retry can fix them", () => {
    const draft = modelDraft();
    draft.segments[0].scene.actions[0].anchor = { kind: "narration", text: "a phrase never spoken" };
    const problems = collectDraftProblems(draft);
    expect(problems.some((problem) => problem.includes("not a phrase from the narration"))).toBe(true);
  });

  it("passes a clean fixture-style draft with no problems", () => {
    expect(collectDraftProblems(modelDraft())).toEqual([]);
  });

  it("catches a mathematically wrong claim via numeric spot-checks", () => {
    const lesson = modelLessonToV3(modelDraft(), { sourceInput: "x", level: "secondary", lessonId: "chk1" });
    expect(runMathChecks(lesson)).toEqual([]);

    const wrong = { ...lesson, mathChecks: [{ kind: "derivative_of" as const, expression: "x^2", expected: "3*x", atX: null }] };
    expect(runMathChecks(wrong).length).toBeGreaterThan(0);
  });

  it("ignores checks it cannot express in the grammar", () => {
    const lesson = modelLessonToV3(modelDraft(), { sourceInput: "x", level: "secondary", lessonId: "chk2" });
    const ungrammatical = { ...lesson, mathChecks: [{ kind: "equivalent" as const, expression: "tan(x)", expected: "sin(x)/cos(x)", atX: null }] };
    expect(runMathChecks(ungrammatical)).toEqual([]);
  });

  it("rescues a draft whose visuals cannot render instead of failing the lesson", () => {
    const draft: Parameters<typeof collectDraftProblems>[0] = modelDraft();
    // A plot outside the grammar plus a broken display formula: exactly the
    // kind of draft that used to exhaust retries and kill the whole job.
    draft.segments[0].scene.elements = [...draft.segments[0].scene.elements,
      { id: "bad", type: "plot", expression: "tan(x)", xMin: -1, xMax: 1, color: "amber", markPointAtX: null }];
    draft.segments[0].displayFormulas = [...draft.segments[0].displayFormulas, { id: "broken", katex: "\\frac{1}", label: null }];
    expect(collectDraftProblems(draft).length).toBeGreaterThan(0);

    const rescued = rescueDraft(draft);
    expect(collectDraftProblems(rescued)).toEqual([]);
    expect(rescued.segments[0].scene.elements.some((element) => element.id === "bad")).toBe(false);
    expect(rescued.segments[0].displayFormulas.some((formula) => formula.id === "broken")).toBe(false);
    // The healthy visual survives the rescue.
    expect(rescued.segments[0].scene.elements.some((element) => element.id === "ramp")).toBe(true);
    expect(() => modelLessonToV3(rescued, { sourceInput: "x", level: "secondary", lessonId: "rescued1" })).not.toThrow();
  });

  it("keeps the committed fixture consistent with the whiteboard contract", () => {
    // Guards against fixture drift breaking the offline demo.
    expect(whiteboardFixtureLesson.segments.length).toBeGreaterThanOrEqual(3);
  });
});
