import { createHash } from "node:crypto";
import { buildSymbolicDerivativeLesson } from "@/lib/lesson/capabilities";
import { CHAIN_RULE_SAMPLE } from "@/lib/lesson/constants";
import { LessonSpecV2Schema, type LessonSpecV2 } from "@/lib/lesson/schema";
import { parseMathExpression } from "@/lib/math/expression";

export const SEEDED_CHAIN_RULE_LESSON_ID = "chain-rule-mission";

const baseLesson = buildSymbolicDerivativeLesson(
  CHAIN_RULE_SAMPLE,
  parseMathExpression("(x^2+1)^3"),
  "differentiate",
);

const segments: LessonSpecV2["segments"] = [
  {
    id: "hook", kind: "hook", templateId: "derivative_rule_story_hook", durationMs: 11_500,
    narration: "A flight computer receives x, transforms it into x squared plus one, then cubes that result. To predict the final signal's change, we must trace change through both transformation gates.",
    transcript: "The signal passes through two nested transformations: first x squared plus one, then cubing.",
    learnerShouldNotice: ["A composite function changes through an inner and an outer transformation"],
  },
  {
    id: "structure", kind: "intuition", templateId: "derivative_expression_structure", durationMs: 13_500,
    narration: "Read the expression from the outside in. The outer machine cubes its input. The inner machine produces x squared plus one. Naming the inner output u makes the structure visible: f equals u cubed.",
    transcript: "Outer: u cubed. Inner: u equals x squared plus one.",
    learnerShouldNotice: ["The outer function is u cubed", "The inner function is x squared plus one"],
    checkpointId: "checkpoint-rule",
  },
  {
    id: "rule", kind: "derivation", templateId: "derivative_chain_rule", durationMs: 16_500,
    narration: "Differentiate the outside while keeping the inside unchanged: three times x squared plus one, squared. Then multiply by the derivative of the inside, two x. That inner derivative is the bridge between the two rates of change.",
    transcript: "Differentiate the outer function, keep the inner expression, then multiply by the inner derivative.",
    learnerShouldNotice: ["The inner derivative two x is a required factor", "The outer exponent drops from three to two"],
  },
  {
    id: "example", kind: "worked_example", templateId: "derivative_rule_worked_example", durationMs: 19_500,
    narration: "Let u equal x squared plus one. The outer derivative is three u squared, and the inner derivative is two x. Multiply them, substitute the inner expression back for u, and simplify to six x times x squared plus one, squared.",
    transcript: "u equals x squared plus one; dy over du equals three u squared; du over dx equals two x; therefore f prime equals six x times x squared plus one, squared.",
    learnerShouldNotice: ["The two rates multiply", "Substitution happens before the final simplification"],
    checkpointId: "checkpoint-error",
  },
  {
    id: "summary", kind: "summary", templateId: "derivative_rule_summary", durationMs: 13_500,
    narration: "For a nested function, travel outside in to identify the layers, then differentiate inside out. Differentiate the outer layer, preserve the inner expression, and multiply by the inner derivative.",
    transcript: "Identify outside in. Differentiate inside out. Never lose the inner derivative.",
    learnerShouldNotice: ["Outer derivative times inner derivative is the reusable chain rule pattern"],
  },
];

const manimChecksums: Record<string, string> = {
  hook: "1c46574184d2c334584fa8f690624e71d462be2876c81fd056c70ba927e1df77",
  structure: "789100ad2e1a3978338b1b1ea3d6cc93e8cc67b6958c35eb7180784b30796aea",
  rule: "44291b3a6b26177f56783c141b020ad86e4159efa93dbc6d3577a133c1ccb8fa",
  example: "246c7a16d62a29406a13bf1e1afc7681f918eded82e0f366d0fc64a0a485990a",
  summary: "11a94d350e95986fa0eb48aadb1ecc8f5abfc2fb140282aaea17025d5b2588d3",
};

export const seededChainRuleLesson = LessonSpecV2Schema.parse({
  ...baseLesson,
  id: SEEDED_CHAIN_RULE_LESSON_ID,
  sourceInput: CHAIN_RULE_SAMPLE,
  objective: "Differentiate a nested function by identifying its outer and inner transformations and preserving the inner derivative.",
  storyHook: {
    setting: "A spacecraft navigation signal passing through two transformation gates",
    task: "Predict how the final guidance signal changes when its original input changes",
    consequence: "Dropping the inner rate sends the spacecraft onto the wrong trajectory",
  },
  segments,
  assets: {
    segments: segments.map((segment) => ({
      segmentId: segment.id,
      videoUrl: `/lesson-assets/chain-rule-seed/${segment.id}.mp4`,
      audioUrl: null,
      posterUrl: `/lesson-assets/chain-rule-seed/${segment.id}.png`,
      captionsUrl: `/lesson-assets/chain-rule-seed/${segment.id}.vtt`,
      durationMs: segment.durationMs,
      checksum: manimChecksums[segment.id] ?? createHash("sha256").update(`${segment.templateId}:${segment.transcript}`).digest("hex"),
      renderMode: "manim" as const,
    })),
  },
});
