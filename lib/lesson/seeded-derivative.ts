import { createHash } from "node:crypto";
import { LessonSpecV1Schema, type LessonSpec } from "@/lib/lesson/schema";
import { DERIVATIVE_SAMPLE } from "@/lib/lesson/constants";

export const SEEDED_DERIVATIVE_LESSON_ID = "derivative-instantaneous-change";
export { DERIVATIVE_SAMPLE } from "@/lib/lesson/constants";

const segments: LessonSpec["segments"] = [
  {
    id: "hook", kind: "hook", templateId: "derivative_story_hook", durationMs: 10_100,
    narration: "An autonomous probe is approaching a narrow gate. Average speed cannot tell it whether to brake right now. It needs to know how fast its position is changing at this instant.",
    transcript: "Average speed describes an interval. The braking system needs the rate of change at one instant.",
    learnerShouldNotice: ["On the same path, average rate of change depends on the chosen interval"],
  },
  {
    id: "secant", kind: "intuition", templateId: "derivative_secant_to_tangent", durationMs: 12_100,
    narration: "Choose two points on the curve. The slope of the secant through them is the average rate of change over that interval. As the second point approaches the first, the interval shrinks and the secant settles toward a tangent.",
    transcript: "Secant slope gives average change. As the second point approaches, the secant approaches the tangent.",
    learnerShouldNotice: ["As h shrinks, the secant slope approaches a stable value", "The tangent preserves the local direction of change"],
    checkpointId: "checkpoint-secant",
  },
  {
    id: "definition", kind: "derivation", templateId: "derivative_limit_definition", durationMs: 16_900,
    narration: "The horizontal change is h. The vertical change is f of x plus h minus f of x. Their ratio is the difference quotient. We do not set h equal to zero first; we simplify, then observe what the quotient approaches as h tends to zero.",
    transcript: "Difference quotient = [f(x+h)-f(x)]/h. Simplify first, then take h→0.",
    learnerShouldNotice: ["Do not substitute h=0 before simplifying", "A limit describes the stable value being approached"],
  },
  {
    id: "example", kind: "worked_example", templateId: "derivative_worked_example", durationMs: 15_600,
    narration: "For f of x equals x squared at x equals one, expansion gives a function-value difference of two h plus h squared. Divide by h and cancel to get two plus h. As h tends to zero, the slope tends to two.",
    transcript: "(1+h)²−1 = 2h+h²; divide by h to get 2+h; therefore f′(1)=2.",
    learnerShouldNotice: ["Cancel h before taking the limit", "The final 2 is a tangent slope, not a function value"],
    checkpointId: "checkpoint-meaning",
  },
  {
    id: "summary", kind: "summary", templateId: "derivative_function_derivative_link", durationMs: 13_500,
    narration: "The derivative maps every position in a function to its instantaneous rate of change there. The function tells us where we are; the derivative tells us how fast that state is changing. Now complete a new derivation yourself.",
    transcript: "f(x) describes state; f′(x) describes the instantaneous rate of change.",
    learnerShouldNotice: ["Function value and derivative value answer different questions"],
  },
];

const manimChecksums: Record<string, string> = {
  hook: "2ac3f30c546a3f35ec4d4058666c9fa4f79bf163442e134a38bb7142f1ef061a",
  secant: "f3df8f7c0ce71516e38653106dfbb26b8f3bc2b60036d5775aefe2bbd509a5f7",
  definition: "971a377767d992fe911204f3bba02327e27b39e95740f0063d66b93303f043a2",
  example: "b8e6e87b1056fb4aae4b4390576be4313fd3cd55e878ca9ef82ba66404694157",
  summary: "ce3c1c37277dc6317b061ac29cf93fc24204e727ef6133960b7398a569320cf9",
};

export const seededDerivativeLesson = LessonSpecV1Schema.parse({
  schemaVersion: 1,
  id: SEEDED_DERIVATIVE_LESSON_ID,
  locale: "en",
  objective: "Explain and calculate instantaneous rate of change using secants approaching a tangent and the difference quotient limit.",
  sourceInput: DERIVATIVE_SAMPLE,
  storyHook: {
    setting: "An autonomous probe approaching a narrow gate",
    task: "Decide whether it must brake right now",
    consequence: "Average speed alone can miss the safe braking point",
  },
  mathModel: { coefficients: [0, 0, 1, 0], evaluationPoint: 1, variable: "x" },
  segments,
  checkpoints: [
    {
      id: "checkpoint-secant", afterSegmentId: "secant",
      prompt: "As the second point approaches the first and h tends to zero, what happens to the secant?",
      options: [
        { id: "stabilize", label: "Its slope approaches the tangent slope at that point", correctness: "correct" },
        { id: "zero", label: "Its slope must approach zero because the distance shrinks", correctness: "incorrect", misconceptionCode: "SUBSTITUTED_ZERO_TOO_EARLY" },
        { id: "unsure", label: "I cannot tell yet", correctness: "uncertain" },
      ],
    },
    {
      id: "checkpoint-meaning", afterSegmentId: "example",
      prompt: "If two functions have the same value at x=1, must they also have the same derivative there?",
      options: [
        { id: "not-necessarily", label: "No; they can pass through the same point in different directions", correctness: "correct" },
        { id: "always", label: "Yes; the function value determines the derivative", correctness: "incorrect", misconceptionCode: "FUNCTION_VALUE_AS_DERIVATIVE" },
        { id: "unsure", label: "I cannot tell yet", correctness: "uncertain" },
      ],
    },
  ],
  guidedPractice: {
    id: "guided-cubic", prompt: "Use the limit definition to find the instantaneous rate of change of f(x)=x²+x at x=2.",
    function: { coefficients: [0, 1, 1, 0], evaluationPoint: 2, variable: "x" },
    steps: [
      { id: "substitute", prompt: "Step 1: Write f(2+h)", placeholder: "For example: (2+h)^2+(2+h)" },
      { id: "difference", prompt: "Step 2: Simplify f(2+h)-f(2)", placeholder: "Expand and combine like terms" },
      { id: "quotient", prompt: "Step 3: Simplify [f(2+h)-f(2)]/h", placeholder: "Factor and cancel h first" },
      { id: "limit", prompt: "Step 4: Evaluate the limit as h→0", placeholder: "Enter the final slope" },
    ],
  },
  remediation: {
    MISSING_CROSS_TERM: "derivative_algebra_expansion_repair",
    INCORRECT_F_X_PLUS_H: "derivative_algebra_expansion_repair",
    WRONG_SUBTRACTION: "derivative_algebra_expansion_repair",
    DID_NOT_DIVIDE_BY_H: "derivative_cancel_h_repair",
    DID_NOT_CANCEL_H: "derivative_cancel_h_repair",
    SUBSTITUTED_ZERO_TOO_EARLY: "derivative_cancel_h_repair",
    FUNCTION_VALUE_AS_DERIVATIVE: "derivative_same_value_different_slope",
    ARITHMETIC_ERROR: "derivative_worked_example",
  },
  transferTask: {
    id: "transfer", prompt: "Without hints, find the instantaneous rate of change of g(x)=x³−2x at x=1. Enter only the final result.",
    function: { coefficients: [0, -2, 0, 1], evaluationPoint: 1, variable: "x" },
  },
  assets: {
    segments: segments.map((segment) => ({
      segmentId: segment.id, videoUrl: `/lesson-assets/derivative-seed/${segment.id}.mp4`, audioUrl: `/lesson-assets/derivative-seed/${segment.id}.mp3`, posterUrl: `/lesson-assets/derivative-seed/${segment.id}.png`, captionsUrl: `/lesson-assets/derivative-seed/${segment.id}.vtt`,
      durationMs: segment.durationMs,
      checksum: manimChecksums[segment.id] ?? createHash("sha256").update(`${segment.templateId}:${segment.transcript}`).digest("hex"),
      renderMode: "manim" as const,
    })),
  },
});

export function isSupportedDerivativeSource(source: string) {
  return /(derivative|instantaneous (?:rate|change)|rate of change|f\s*\(\s*x\s*\))/i.test(source);
}
