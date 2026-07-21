import { z } from "zod";
import { ExpressionAstSchema } from "@/lib/math/expression";
import { DerivativeCapabilitySchema, ManimTemplateIdSchema, PolynomialFunctionSpecSchema, type DerivativeLessonSpec, type LessonSpec } from "@/lib/lesson/schema";

const RendererParamsSchema = z.union([
  z.object({ kind: z.literal("polynomial"), coefficients: PolynomialFunctionSpecSchema.shape.coefficients, evaluation_point: z.number().int().min(-6).max(6) }).strict(),
  z.object({ kind: z.literal("symbolic"), expression_ast: ExpressionAstSchema, derivative_ast: ExpressionAstSchema, capability: DerivativeCapabilitySchema, evaluation_point: z.number().int().min(-6).max(6).optional() }).strict(),
]);

const RendererRequestSchema = z.object({
  template_id: ManimTemplateIdSchema,
  params: RendererParamsSchema,
  locale: z.literal("en"), narration: z.string().min(1).max(1200), duration_ms: z.number().int().min(4_000).max(30_000),
  theme: z.literal("calculus_lab"),
}).strict();

const RenderJobSchema = z.object({
  id: z.string(), status: z.enum(["processing", "complete", "error"]), cached: z.boolean().optional(),
  videoUrl: z.string().optional(), posterUrl: z.string().optional(), captionsUrl: z.string().optional(),
  durationMs: z.number().optional(), checksum: z.string().optional(), renderMode: z.literal("manim").optional(),
  error: z.object({ code: z.string(), message: z.string(), recoverable: z.boolean() }).optional(),
}).passthrough();

const wait = (duration: number) => new Promise((resolve) => setTimeout(resolve, duration));

const MathAnalysisResponseSchema = z.object({
  derivative_ast: ExpressionAstSchema,
  capability: DerivativeCapabilitySchema,
  derivative_text: z.string(),
  expected_matches: z.boolean(),
  slope: z.string().optional(),
}).strict();

export async function verifyLessonMath(lesson: LessonSpec, rendererUrl = process.env.MANIM_RENDERER_URL) {
  if (lesson.schemaVersion !== 2 || !rendererUrl) return lesson;
  let analysis: z.infer<typeof MathAnalysisResponseSchema>;
  try {
    const response = await fetch(`${rendererUrl.replace(/\/$/, "")}/v1/math/analyze`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ expression_ast: lesson.mathModel.sourceExpression, expected_derivative_ast: lesson.mathModel.derivativeExpression, task: lesson.mathModel.task, evaluation_point: lesson.mathModel.evaluationPoint?.numerator }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return lesson;
    const parsed = MathAnalysisResponseSchema.safeParse(await response.json());
    if (!parsed.success) return lesson;
    analysis = parsed.data;
  } catch {
    // The TypeScript parser and differentiator have already produced the
    // verified lesson. An unavailable optional worker must select the SVG
    // fallback, not stop the lesson before publication.
    return lesson;
  }
  if (!analysis.expected_matches || analysis.capability !== lesson.capability) throw new Error("The independent symbolic verifier disagreed with the lesson analysis.");
  return lesson;
}

export async function renderLessonSegment(lesson: DerivativeLessonSpec, segment: DerivativeLessonSpec["segments"][number], rendererUrl = process.env.MANIM_RENDERER_URL) {
  if (!rendererUrl) return null;
  const params = lesson.schemaVersion === 1
    ? { kind: "polynomial" as const, coefficients: lesson.mathModel.coefficients, evaluation_point: lesson.mathModel.evaluationPoint }
    : { kind: "symbolic" as const, expression_ast: lesson.mathModel.sourceExpression, derivative_ast: lesson.mathModel.derivativeExpression, capability: lesson.capability, evaluation_point: lesson.mathModel.evaluationPoint?.numerator };
  const request = RendererRequestSchema.parse({ template_id: segment.templateId, params, locale: lesson.locale, narration: segment.narration, duration_ms: segment.durationMs, theme: "calculus_lab" });
  const createdResponse = await fetch(`${rendererUrl.replace(/\/$/, "")}/v1/renders`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(request), signal: AbortSignal.timeout(5_000) });
  if (!createdResponse.ok) throw new Error(`Renderer rejected ${segment.templateId}.`);
  let job = RenderJobSchema.parse(await createdResponse.json());
  const deadline = Date.now() + 95_000;
  while (job.status === "processing" && Date.now() < deadline) {
    await wait(500);
    const response = await fetch(`${rendererUrl.replace(/\/$/, "")}/v1/renders/${encodeURIComponent(job.id)}`, { cache: "no-store", signal: AbortSignal.timeout(5_000) });
    if (!response.ok) throw new Error("Renderer job disappeared.");
    job = RenderJobSchema.parse(await response.json());
  }
  if (job.status !== "complete" || !job.videoUrl || !job.checksum) throw new Error(job.error?.message ?? "Renderer timed out.");
  return { segmentId: segment.id, videoUrl: job.videoUrl, audioUrl: null, posterUrl: job.posterUrl ?? null, captionsUrl: job.captionsUrl ?? null, durationMs: job.durationMs ?? segment.durationMs, checksum: job.checksum, renderMode: "manim" as const };
}

export async function renderLessonAssets(lesson: DerivativeLessonSpec) {
  if (!process.env.MANIM_RENDERER_URL) return lesson;
  const assets = await Promise.all(lesson.segments.map(async (segment) => {
    const fallback = lesson.assets.segments.find((asset) => asset.segmentId === segment.id)!;
    try {
      const rendered = await renderLessonSegment(lesson, segment);
      return rendered ? { ...rendered, audioUrl: fallback.audioUrl } : fallback;
    }
    catch { return fallback; }
  }));
  return { ...lesson, assets: { segments: assets } };
}
