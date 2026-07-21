import { z } from "zod";
import { ExpressionAstSchema, RationalSpecSchema } from "@/lib/math/expression";

export const LocaleSchema = z.literal("en");

export const ManimTemplateIdSchema = z.enum([
  "derivative_story_hook", "derivative_secant_to_tangent", "derivative_limit_definition",
  "derivative_worked_example", "derivative_same_value_different_slope",
  "derivative_algebra_expansion_repair", "derivative_cancel_h_repair",
  "derivative_function_derivative_link", "derivative_rule_story_hook",
  "derivative_expression_structure", "derivative_power_sum_rule", "derivative_product_rule",
  "derivative_quotient_rule", "derivative_chain_rule", "derivative_standard_function_rule",
  "derivative_rule_worked_example", "derivative_rule_summary",
  "derivative_missing_inner_repair", "derivative_product_repair",
  "derivative_quotient_repair", "derivative_standard_function_repair",
]);

export const PolynomialFunctionSpecSchema = z.object({
  coefficients: z.tuple([
    z.number().int().min(-12).max(12), z.number().int().min(-12).max(12),
    z.number().int().min(-12).max(12), z.number().int().min(-12).max(12),
  ]),
  evaluationPoint: z.number().int().min(-6).max(6),
  variable: z.literal("x"),
}).strict();

const DiagnosticOptionSchema = z.object({
  id: z.string(), label: z.string(), correctness: z.enum(["correct", "incorrect", "uncertain"]),
  misconceptionCode: z.string().nullish(),
}).strict();

export const DiagnosticCheckpointSchema = z.object({
  id: z.string(), prompt: z.string(), options: z.array(DiagnosticOptionSchema).length(3), afterSegmentId: z.string(),
}).strict();

export const LessonSegmentSchema = z.object({
  id: z.string(), kind: z.enum(["hook", "intuition", "derivation", "worked_example", "summary"]),
  templateId: ManimTemplateIdSchema, narration: z.string(), transcript: z.string(),
  learnerShouldNotice: z.array(z.string()).min(1), checkpointId: z.string().nullish(),
  durationMs: z.number().int().min(4_000).max(30_000),
}).strict();

const AssetSchema = z.object({
  segmentId: z.string(), videoUrl: z.string().nullable(), audioUrl: z.string().nullable(),
  posterUrl: z.string().nullable(), captionsUrl: z.string().nullable(),
  durationMs: z.number().int().positive(), checksum: z.string(), renderMode: z.enum(["manim", "svg_fallback"]),
}).strict();

const SharedLessonSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9-]+$/), locale: LocaleSchema, objective: z.string(), sourceInput: z.string(),
  storyHook: z.object({ setting: z.string(), task: z.string(), consequence: z.string() }).strict(),
  segments: z.array(LessonSegmentSchema).length(5),
  checkpoints: z.tuple([DiagnosticCheckpointSchema, DiagnosticCheckpointSchema]),
  remediation: z.record(z.string(), ManimTemplateIdSchema),
  assets: z.object({ segments: z.array(AssetSchema).length(5) }).strict(),
});

const LegacyExerciseStepSchema = z.object({
  id: z.enum(["substitute", "difference", "quotient", "limit"]), prompt: z.string(), placeholder: z.string(),
}).strict();

export const LessonSpecV1Schema = SharedLessonSchema.extend({
  schemaVersion: z.literal(1),
  mathModel: PolynomialFunctionSpecSchema,
  guidedPractice: z.object({
    id: z.string(), prompt: z.string(), function: PolynomialFunctionSpecSchema,
    steps: z.array(LegacyExerciseStepSchema).length(4),
  }).strict(),
  transferTask: z.object({ id: z.string(), prompt: z.string(), function: PolynomialFunctionSpecSchema }).strict(),
}).strict();

export const DerivativeCapabilitySchema = z.enum(["power", "sum", "product", "quotient", "chain", "standard_function"]);

const RuleApplicationSchema = z.object({
  rule: DerivativeCapabilitySchema, source: ExpressionAstSchema, result: ExpressionAstSchema,
}).strict();

export const SymbolicDerivativeSpecSchema = z.object({
  sourceExpression: ExpressionAstSchema,
  task: z.enum(["differentiate", "slope_at_point"]),
  evaluationPoint: RationalSpecSchema.optional(),
  primaryRule: DerivativeCapabilitySchema,
  derivativeExpression: ExpressionAstSchema,
  ruleApplications: z.array(RuleApplicationSchema).min(1).max(12),
  domainNotes: z.array(z.string()).max(4),
}).strict();

const GuidedFieldSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/), label: z.string(), placeholder: z.string(), expected: ExpressionAstSchema,
}).strict();

const GuidedStepV2Schema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  kind: z.enum(["decompose", "differentiate_parts", "assemble", "simplify"]),
  prompt: z.string(), fields: z.array(GuidedFieldSchema).min(1).max(2),
}).strict();

export const LessonSpecV2Schema = SharedLessonSchema.extend({
  schemaVersion: z.literal(2),
  capability: DerivativeCapabilitySchema,
  mathModel: SymbolicDerivativeSpecSchema,
  guidedPractice: z.object({
    id: z.string(), prompt: z.string(), sourceExpression: ExpressionAstSchema,
    steps: z.array(GuidedStepV2Schema).length(4),
  }).strict(),
  remediationCheck: z.object({ prompt: z.string(), expectedExpression: ExpressionAstSchema }).strict(),
  transferTask: z.object({
    id: z.string(), prompt: z.string(), sourceExpression: ExpressionAstSchema,
    expectedExpression: ExpressionAstSchema,
  }).strict(),
}).strict();

export const LessonSpecSchema = z.union([LessonSpecV1Schema, LessonSpecV2Schema]);

export const MisconceptionCodeSchema = z.enum([
  "INCORRECT_F_X_PLUS_H", "MISSING_CROSS_TERM", "WRONG_SUBTRACTION", "DID_NOT_DIVIDE_BY_H",
  "DID_NOT_CANCEL_H", "SUBSTITUTED_ZERO_TOO_EARLY", "FUNCTION_VALUE_AS_DERIVATIVE", "ARITHMETIC_ERROR",
  "WRONG_DERIVATIVE_RULE", "OUTER_INNER_REVERSED", "MISSING_INNER_DERIVATIVE",
  "PRODUCT_OF_DERIVATIVES", "MISSING_PRODUCT_TERM", "QUOTIENT_ORDER_REVERSED",
  "MISSING_DENOMINATOR_SQUARE", "STANDARD_DERIVATIVE_ERROR", "ALGEBRA_SIMPLIFICATION_ERROR",
]);

export const LessonStoryStateSchema = z.object({
  currentSegmentIndex: z.number().int().nonnegative(), completedSegmentIds: z.array(z.string()),
  taskStatus: z.enum(["briefing", "learning", "practice", "transfer", "complete"]),
}).strict();

export const LessonLearnerStateSchema = z.object({
  checkpointEvidence: z.array(z.object({ checkpointId: z.string(), optionId: z.string(), correct: z.boolean() }).strict()),
  stepAttempts: z.record(z.string(), z.number().int().nonnegative()),
  possibleMisconceptions: z.array(MisconceptionCodeSchema),
  representationsUsed: z.array(z.enum(["manim", "svg_fallback", "equation", "counterexample", "worked_example"])),
  completedStepIds: z.array(z.string()), transferCorrect: z.boolean().nullable(),
  transferNormalizedAnswer: z.string().nullable().default(null),
}).strict();

export type LessonSpecV1 = z.infer<typeof LessonSpecV1Schema>;
export type LessonSpecV2 = z.infer<typeof LessonSpecV2Schema>;
export type LessonSpec = z.infer<typeof LessonSpecSchema>;
export type ManimTemplateId = z.infer<typeof ManimTemplateIdSchema>;
export type LessonStoryState = z.infer<typeof LessonStoryStateSchema>;
export type LessonLearnerState = z.infer<typeof LessonLearnerStateSchema>;
export type MisconceptionCode = z.infer<typeof MisconceptionCodeSchema>;
export type DerivativeCapability = z.infer<typeof DerivativeCapabilitySchema>;

export function createInitialLessonStates(): { storyState: LessonStoryState; learnerState: LessonLearnerState } {
  return {
    storyState: { currentSegmentIndex: 0, completedSegmentIds: [], taskStatus: "briefing" },
    learnerState: { checkpointEvidence: [], stepAttempts: {}, possibleMisconceptions: [], representationsUsed: [], completedStepIds: [], transferCorrect: null, transferNormalizedAnswer: null },
  };
}
