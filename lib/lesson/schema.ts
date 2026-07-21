import { z } from "zod";

export const LocaleSchema = z.literal("en");

export const ManimTemplateIdSchema = z.enum([
  "derivative_story_hook",
  "derivative_secant_to_tangent",
  "derivative_limit_definition",
  "derivative_worked_example",
  "derivative_same_value_different_slope",
  "derivative_algebra_expansion_repair",
  "derivative_cancel_h_repair",
  "derivative_function_derivative_link",
]);

export const PolynomialFunctionSpecSchema = z.object({
  coefficients: z.tuple([
    z.number().int().min(-12).max(12),
    z.number().int().min(-12).max(12),
    z.number().int().min(-12).max(12),
    z.number().int().min(-12).max(12),
  ]),
  evaluationPoint: z.number().int().min(-6).max(6),
  variable: z.literal("x"),
}).strict();

const DiagnosticOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  correctness: z.enum(["correct", "incorrect", "uncertain"]),
  misconceptionCode: z.string().nullish(),
}).strict();

export const DiagnosticCheckpointSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  options: z.array(DiagnosticOptionSchema).length(3),
  afterSegmentId: z.string(),
}).strict();

export const LessonSegmentSchema = z.object({
  id: z.string(),
  kind: z.enum(["hook", "intuition", "derivation", "worked_example", "summary"]),
  templateId: ManimTemplateIdSchema,
  narration: z.string(),
  transcript: z.string(),
  learnerShouldNotice: z.array(z.string()).min(1),
  checkpointId: z.string().nullish(),
  durationMs: z.number().int().min(4_000).max(30_000),
}).strict();

const ExerciseStepSchema = z.object({
  id: z.enum(["substitute", "difference", "quotient", "limit"]),
  prompt: z.string(),
  placeholder: z.string(),
}).strict();

const ExerciseSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  function: PolynomialFunctionSpecSchema,
  steps: z.array(ExerciseStepSchema).length(4),
}).strict();

const AssetSchema = z.object({
  segmentId: z.string(),
  videoUrl: z.string().nullable(),
  audioUrl: z.string().nullable(),
  posterUrl: z.string().nullable(),
  captionsUrl: z.string().nullable(),
  durationMs: z.number().int().positive(),
  checksum: z.string(),
  renderMode: z.enum(["manim", "svg_fallback"]),
}).strict();

export const LessonSpecSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9-]+$/),
  locale: LocaleSchema,
  objective: z.string(),
  sourceInput: z.string(),
  storyHook: z.object({ setting: z.string(), task: z.string(), consequence: z.string() }).strict(),
  mathModel: PolynomialFunctionSpecSchema,
  segments: z.array(LessonSegmentSchema).min(5),
  checkpoints: z.tuple([DiagnosticCheckpointSchema, DiagnosticCheckpointSchema]),
  guidedPractice: ExerciseSchema,
  remediation: z.record(z.string(), ManimTemplateIdSchema),
  transferTask: z.object({
    id: z.string(),
    prompt: z.string(),
    function: PolynomialFunctionSpecSchema,
  }).strict(),
  assets: z.object({ segments: z.array(AssetSchema) }).strict(),
}).strict();

export const MisconceptionCodeSchema = z.enum([
  "INCORRECT_F_X_PLUS_H",
  "MISSING_CROSS_TERM",
  "WRONG_SUBTRACTION",
  "DID_NOT_DIVIDE_BY_H",
  "DID_NOT_CANCEL_H",
  "SUBSTITUTED_ZERO_TOO_EARLY",
  "FUNCTION_VALUE_AS_DERIVATIVE",
  "ARITHMETIC_ERROR",
]);

export const LessonStoryStateSchema = z.object({
  currentSegmentIndex: z.number().int().nonnegative(),
  completedSegmentIds: z.array(z.string()),
  taskStatus: z.enum(["briefing", "learning", "practice", "transfer", "complete"]),
}).strict();

export const LessonLearnerStateSchema = z.object({
  checkpointEvidence: z.array(z.object({
    checkpointId: z.string(), optionId: z.string(), correct: z.boolean(),
  }).strict()),
  stepAttempts: z.record(z.string(), z.number().int().nonnegative()),
  possibleMisconceptions: z.array(MisconceptionCodeSchema),
  representationsUsed: z.array(z.enum(["manim", "svg_fallback", "equation", "counterexample", "worked_example"])),
  completedStepIds: z.array(z.string()),
  transferCorrect: z.boolean().nullable(),
}).strict();

export type LessonSpec = z.infer<typeof LessonSpecSchema>;
export type ManimTemplateId = z.infer<typeof ManimTemplateIdSchema>;
export type LessonStoryState = z.infer<typeof LessonStoryStateSchema>;
export type LessonLearnerState = z.infer<typeof LessonLearnerStateSchema>;
export type MisconceptionCode = z.infer<typeof MisconceptionCodeSchema>;

export function createInitialLessonStates(): { storyState: LessonStoryState; learnerState: LessonLearnerState } {
  return {
    storyState: { currentSegmentIndex: 0, completedSegmentIds: [], taskStatus: "briefing" },
    learnerState: {
      checkpointEvidence: [], stepAttempts: {}, possibleMisconceptions: [],
      representationsUsed: [], completedStepIds: [], transferCorrect: null,
    },
  };
}
