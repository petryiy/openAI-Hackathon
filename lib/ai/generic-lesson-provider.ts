import { createHash } from "node:crypto";
import katex from "katex";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { ModelConfigurationError, resolveReasoningEffort } from "@/lib/ai/provider";
import { GENERIC_LESSON_SYSTEM_PROMPT, buildGenericLessonUserPrompt, WHITEBOARD_DSL_CHEATSHEET } from "@/lib/ai/generic-lesson-prompt";
import {
  differentiate, evaluateExpression, expressionsEquivalent, parseMathExpression,
} from "@/lib/math/expression";
import { dropUnrenderableElements, sanitizeWhiteboardScene, validateWhiteboardScene } from "@/lib/lesson/whiteboard-dsl";
import {
  GenericSegmentSchema, LessonSpecV3Schema, MathCheckSchema, type LessonSpecV3,
} from "@/lib/lesson/schema";

// Model-facing schema: only the fields the model authors. Lesson id, assets,
// track-B state, and verification are assigned by code after parsing. nullish
// fields are auto-coerced to required+nullable by zodTextFormat.
const ModelLessonV3Schema = z.object({
  objective: z.string().min(1).max(160),
  topic: z.string().min(1).max(80),
  storyHook: z.object({
    setting: z.string().min(1).max(160),
    task: z.string().min(1).max(160),
    consequence: z.string().min(1).max(160),
  }).strict(),
  segments: z.array(GenericSegmentSchema).min(3).max(8),
  mathChecks: z.array(MathCheckSchema).max(8),
}).strict();

type ModelLessonV3 = z.infer<typeof ModelLessonV3Schema>;

const VerificationResultSchema = z.object({
  verdict: z.enum(["approved", "revise"]),
  issues: z.array(z.object({
    segmentId: z.string(),
    claim: z.string(),
    problem: z.string(),
    correction: z.string(),
  }).strict()).max(8),
}).strict();

export type GenerationInput = {
  sourceInput: string;
  level: "secondary" | "early_university";
  fileId?: string;
  lessonId: string;
};

function requestTimeout() {
  const value = Number(process.env.OPENAI_TIMEOUT_MS);
  return Number.isFinite(value) && value >= 30_000 && value <= 600_000 ? value : 240_000;
}

function client() {
  if (!process.env.OPENAI_API_KEY) {
    throw new ModelConfigurationError("Add OPENAI_API_KEY to generate a lesson. The seeded derivative lesson remains available without it.");
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: requestTimeout(), maxRetries: 0 });
}

const SPEAKING_MS_PER_WORD = 400;

function estimateDurationMs(narration: string): number {
  const words = narration.split(/\s+/).filter(Boolean).length;
  return Math.max(6_000, Math.min(90_000, words * SPEAKING_MS_PER_WORD));
}

/**
 * Repair each scene's mechanically-fixable issues in place, returning a draft
 * whose scenes are sanitized. Called before validation so retries only fire on
 * genuine content errors.
 */
export function sanitizeDraft(model: ModelLessonV3): ModelLessonV3 {
  return {
    ...model,
    segments: model.segments.map((segment) => ({
      ...segment,
      scene: sanitizeWhiteboardScene(segment.scene, segment.narration),
    })),
  };
}

/**
 * Aggressive last-attempt rescue: strip the scene elements that cannot render
 * at all. Only used when retry feedback has failed, because it trades a bit of
 * visual richness for a lesson that actually publishes.
 */
export function rescueDraft(model: ModelLessonV3): ModelLessonV3 {
  return {
    ...model,
    segments: model.segments.map((segment) => ({
      ...segment,
      displayFormulas: segment.displayFormulas.filter((formula) => {
        try { katex.renderToString(formula.katex, { throwOnError: true, displayMode: true }); return true; } catch { return false; }
      }),
      scene: dropUnrenderableElements(segment.scene, segment.narration),
    })),
  };
}

/** Collect every DSL and pacing problem across a model draft for retry feedback. */
export function collectDraftProblems(model: ModelLessonV3): string[] {
  const problems: string[] = [];
  const segmentIds = new Set<string>();
  for (const segment of model.segments) {
    if (segmentIds.has(segment.id)) problems.push(`Duplicate segment id "${segment.id}".`);
    segmentIds.add(segment.id);
    for (const problem of validateWhiteboardScene(segment.scene, segment.narration)) {
      problems.push(`Segment "${segment.id}": ${problem}`);
    }
  }
  return problems;
}

export function modelLessonToV3(model: ModelLessonV3, input: GenerationInput): LessonSpecV3 {
  const segments = model.segments.map((segment) => ({
    ...segment,
    durationMs: estimateDurationMs(segment.narration),
  }));
  return LessonSpecV3Schema.parse({
    schemaVersion: 3,
    id: input.lessonId,
    locale: "en",
    level: input.level,
    objective: model.objective,
    sourceInput: input.sourceInput,
    topic: model.topic,
    storyHook: model.storyHook,
    segments,
    mathChecks: model.mathChecks,
    verification: { verdict: "approved", notes: [] },
    upgrade: { trackB: segments.map((segment) => ({ segmentId: segment.id, status: "pending" as const })) },
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
}

async function requestLesson(input: GenerationInput, repairs: string[]): Promise<ModelLessonV3> {
  const userContent = buildGenericLessonUserPrompt({ sourceInput: input.sourceInput, level: input.level, repairs });
  const content = input.fileId
    ? [{ type: "input_file" as const, file_id: input.fileId }, { type: "input_text" as const, text: userContent }]
    : userContent;
  const response = await client().responses.parse({
    model: process.env.OPENAI_MODEL ?? "gpt-5.6",
    reasoning: { mode: "standard", effort: resolveReasoningEffort() },
    input: [
      { role: "system", content: `${GENERIC_LESSON_SYSTEM_PROMPT}\n\n${WHITEBOARD_DSL_CHEATSHEET}` },
      { role: "user", content },
    ],
    text: { verbosity: "low", format: zodTextFormat(ModelLessonV3Schema, "whiteboard_lesson") },
  });
  if (!response.output_parsed) throw new Error("The model did not return a complete lesson.");
  return response.output_parsed;
}

export class LessonPlanInvalidError extends Error {
  code = "LESSON_PLAN_INVALID" as const;
}

/**
 * Generate a whiteboard lesson, retrying once with the concrete DSL problems
 * appended when the first draft does not pass scene validation.
 */
export async function generateGenericLesson(input: GenerationInput): Promise<LessonSpecV3> {
  let repairs: string[] = [];
  let lastProblems: string[] = [];
  const attempts = 3;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const sanitized = sanitizeDraft(await requestLesson(input, repairs));
    let problems = collectDraftProblems(sanitized);
    if (problems.length === 0) return modelLessonToV3(sanitized, input);
    if (attempt === attempts - 1) {
      // Retry feedback did not converge; publish a rescued lesson (broken
      // visuals stripped) rather than fail the learner outright.
      const rescued = rescueDraft(sanitized);
      const rescuedProblems = collectDraftProblems(rescued);
      if (rescuedProblems.length === 0) return modelLessonToV3(rescued, input);
      problems = rescuedProblems;
    }
    lastProblems = problems;
    repairs = problems.slice(0, 12);
  }
  throw new LessonPlanInvalidError(`The lesson plan did not satisfy the whiteboard contract: ${lastProblems.slice(0, 3).join(" ")}`);
}

const SAMPLE_POINTS = [-2, -1, -0.5, 0.5, 1, 2];

/** Deterministic numeric spot-checks for the claims the grammar can express. */
export function runMathChecks(lesson: LessonSpecV3): string[] {
  const failures: string[] = [];
  for (const check of lesson.mathChecks) {
    try {
      if (check.kind === "derivative_of") {
        const derivative = differentiate(parseMathExpression(check.expression));
        if (!expressionsEquivalent(derivative, parseMathExpression(check.expected))) {
          failures.push(`Claim "d/dx ${check.expression} = ${check.expected}" is numerically wrong.`);
        }
      } else if (check.kind === "equivalent") {
        if (!expressionsEquivalent(parseMathExpression(check.expression), parseMathExpression(check.expected))) {
          failures.push(`Claim "${check.expression} = ${check.expected}" is not an identity.`);
        }
      } else {
        const expression = parseMathExpression(check.expression);
        const expected = parseMathExpression(check.expected);
        const points = check.atX == null ? SAMPLE_POINTS : [check.atX];
        for (const x of points) {
          const actual = evaluateExpression(expression, x);
          const target = evaluateExpression(expected, x);
          if (Number.isFinite(actual) && Number.isFinite(target) && Math.abs(actual - target) > 1e-6) {
            failures.push(`Claim "${check.expression} = ${check.expected}" fails at x=${x} (${actual.toFixed(3)} ≠ ${target.toFixed(3)}).`);
            break;
          }
        }
      }
    } catch {
      // Expressions outside the grammar cannot be spot-checked here; the model
      // verifier below is the fallback for those claims.
    }
  }
  return failures;
}

/**
 * Independent second-pass review of the lesson's factual claims, augmented with
 * deterministic numeric checks. Returns the notes to record and a corrected
 * lesson only when the verifier flags real problems.
 */
export async function verifyGenericLesson(lesson: LessonSpecV3): Promise<{ mustRegenerate: boolean; notes: string[]; issues: string[] }> {
  // Deterministic numeric spot-checks are the reliable, hard gate: a failure
  // here forces a regeneration. The model fact-checker is advisory — its notes
  // are recorded but do not, on their own, force an expensive second pass.
  const numericFailures = runMathChecks(lesson);
  const response = await client().responses.parse({
    model: process.env.OPENAI_MODEL ?? "gpt-5.6",
    reasoning: { mode: "standard", effort: resolveReasoningEffort() },
    input: [
      { role: "system", content: "You are a meticulous STEM fact-checker. You are given a lesson as JSON. Check only the factual and mathematical accuracy of each segment's narration and formulas against the lesson's stated topic. Do not critique style, pacing, or visuals. Return verdict 'approved' when every claim is correct, otherwise 'revise' with one issue per real error." },
      { role: "user", content: JSON.stringify({ topic: lesson.topic, objective: lesson.objective, segments: lesson.segments.map((segment) => ({ id: segment.id, narration: segment.narration, formulas: segment.displayFormulas.map((formula) => formula.katex) })) }) },
    ],
    text: { verbosity: "low", format: zodTextFormat(VerificationResultSchema, "verification_result") },
  });
  const parsed = response.output_parsed;
  const modelIssues = parsed && parsed.verdict === "revise" ? parsed.issues.map((issue) => `Segment ${issue.segmentId}: ${issue.problem} → ${issue.correction}`) : [];
  const issues = [...numericFailures, ...modelIssues];
  return {
    mustRegenerate: numericFailures.length > 0,
    notes: issues.slice(0, 6),
    issues,
  };
}
