import { z } from "zod";
import { ManimTemplateIdSchema, PolynomialFunctionSpecSchema, type LessonSpec } from "@/lib/lesson/schema";

const RendererRequestSchema = z.object({
  template_id: ManimTemplateIdSchema,
  params: z.object({ coefficients: PolynomialFunctionSpecSchema.shape.coefficients, evaluation_point: z.number().int().min(-6).max(6) }).strict(),
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

export async function renderLessonSegment(lesson: LessonSpec, segment: LessonSpec["segments"][number], rendererUrl = process.env.MANIM_RENDERER_URL) {
  if (!rendererUrl) return null;
  const request = RendererRequestSchema.parse({ template_id: segment.templateId, params: { coefficients: lesson.mathModel.coefficients, evaluation_point: lesson.mathModel.evaluationPoint }, locale: lesson.locale, narration: segment.narration, duration_ms: segment.durationMs, theme: "calculus_lab" });
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

export async function renderLessonAssets(lesson: LessonSpec) {
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
