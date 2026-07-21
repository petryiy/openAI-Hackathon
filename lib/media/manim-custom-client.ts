import { z } from "zod";

const CustomRenderJobSchema = z.object({
  id: z.string(),
  status: z.enum(["processing", "complete", "error"]),
  videoUrl: z.string().optional(),
  posterUrl: z.string().optional(),
  captionsUrl: z.string().optional(),
  durationMs: z.number().optional(),
  checksum: z.string().optional(),
  renderMode: z.literal("manim").optional(),
  error: z.object({ code: z.string(), message: z.string(), recoverable: z.boolean() }).optional(),
}).passthrough();

export type CustomRenderResult = {
  videoUrl: string;
  posterUrl: string | null;
  captionsUrl: string | null;
  durationMs: number;
  checksum: string;
};

export class CustomRenderError extends Error {}

const wait = (duration: number) => new Promise((resolve) => setTimeout(resolve, duration));

/**
 * Cheap liveness probe so Track B does not pay for LLM code generation when the
 * renderer is unreachable. Any HTTP response (even a 404) proves the service is
 * up; a thrown error means it is down.
 */
export async function isRendererReachable(rendererUrl = process.env.MANIM_RENDERER_URL): Promise<boolean> {
  if (!rendererUrl) return false;
  try {
    await fetch(`${rendererUrl.replace(/\/$/, "")}/v1/renders/health-probe`, { method: "GET", signal: AbortSignal.timeout(2_500) });
    return true;
  } catch {
    return false;
  }
}

/**
 * Submit model-authored Manim scene code to the renderer's sandboxed custom
 * endpoint and poll until it renders or fails. A render failure throws with the
 * renderer's traceback so the caller can feed it back into the next codegen
 * attempt.
 */
export async function renderCustomScene(
  sceneCode: string,
  narration: string,
  durationMs: number,
  rendererUrl = process.env.MANIM_RENDERER_URL,
): Promise<CustomRenderResult> {
  if (!rendererUrl) throw new CustomRenderError("No Manim renderer is configured.");
  const base = rendererUrl.replace(/\/$/, "");
  const created = await fetch(`${base}/v1/renders/custom`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ scene_code: sceneCode, narration: narration.slice(0, 2_000), duration_ms: durationMs }),
    signal: AbortSignal.timeout(8_000),
  });
  if (created.status === 422) {
    const detail = await created.json().catch(() => null) as { detail?: string } | null;
    throw new CustomRenderError(`Scene rejected by validator: ${detail?.detail ?? "invalid scene code"}`);
  }
  if (!created.ok) throw new CustomRenderError(`Renderer rejected the custom scene (status ${created.status}).`);

  let job = CustomRenderJobSchema.parse(await created.json());
  const deadline = Date.now() + 180_000;
  while (job.status === "processing" && Date.now() < deadline) {
    await wait(750);
    const response = await fetch(`${base}/v1/renders/${encodeURIComponent(job.id)}`, { cache: "no-store", signal: AbortSignal.timeout(8_000) });
    if (!response.ok) throw new CustomRenderError("Renderer job disappeared.");
    job = CustomRenderJobSchema.parse(await response.json());
  }
  if (job.status !== "complete" || !job.videoUrl || !job.checksum) {
    throw new CustomRenderError(job.error?.message ?? "Renderer timed out on the custom scene.");
  }
  return {
    videoUrl: job.videoUrl,
    posterUrl: job.posterUrl ?? null,
    captionsUrl: job.captionsUrl ?? null,
    durationMs: job.durationMs ?? durationMs,
    checksum: job.checksum,
  };
}
