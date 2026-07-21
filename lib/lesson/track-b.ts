import { readLesson, saveLesson } from "@/lib/storage/local-store";
import { generateManimSceneCode, looksLikeValidScene } from "@/lib/ai/manim-code-provider";
import { CustomRenderError, isRendererReachable, renderCustomScene } from "@/lib/media/manim-custom-client";
import type { LessonSpecV3 } from "@/lib/lesson/schema";

function trackBEnabled(): boolean {
  if (process.env.TRACK_B_ENABLED === "false") return false;
  return Boolean(process.env.MANIM_RENDERER_URL);
}

function maxAttempts(): number {
  const value = Number(process.env.TRACK_B_MAX_ATTEMPTS);
  return Number.isInteger(value) && value >= 1 && value <= 5 ? value : 3;
}

function budgetMs(): number {
  const value = Number(process.env.TRACK_B_BUDGET_MS);
  return Number.isFinite(value) && value >= 60_000 ? value : 480_000;
}

async function setSegmentStatus(lessonId: string, segmentId: string, status: "complete" | "failed", patch?: Partial<LessonSpecV3["assets"]["segments"][number]>) {
  const current = await readLesson(lessonId);
  if (!current || current.schemaVersion !== 3) return;
  const next: LessonSpecV3 = {
    ...current,
    assets: {
      segments: current.assets.segments.map((asset) => asset.segmentId === segmentId && patch ? { ...asset, ...patch } : asset),
    },
    upgrade: {
      trackB: current.upgrade.trackB.map((entry) => entry.segmentId === segmentId ? { ...entry, status } : entry),
    },
  };
  await saveLesson(next);
}

/**
 * Track B: attempt to upgrade each whiteboard segment to a cinematic Manim
 * render. Runs sequentially (the renderer serializes anyway), retries codegen
 * with the traceback on failure, and never throws upward — segments that fail
 * simply remain on the whiteboard, which is an acceptable end state. Completed
 * segments are hot-swapped into the stored lesson so the player can pick them
 * up on its next poll.
 */
export async function upgradeLessonWithManim(lessonId: string): Promise<void> {
  const lesson = await readLesson(lessonId);
  if (!lesson || lesson.schemaVersion !== 3) return;

  // Probe the renderer BEFORE any code generation so a configured-but-dead
  // renderer never burns expensive LLM codegen calls that can only fail.
  if (!trackBEnabled() || !(await isRendererReachable())) {
    for (const segment of lesson.segments) await setSegmentStatus(lessonId, segment.id, "failed");
    return;
  }

  const deadline = Date.now() + budgetMs();
  let rendererAlive = true;
  for (const segment of lesson.segments) {
    if (!rendererAlive || Date.now() > deadline) { await setSegmentStatus(lessonId, segment.id, "failed"); continue; }
    const asset = lesson.assets.segments.find((item) => item.segmentId === segment.id);
    const durationMs = asset?.durationMs ?? segment.durationMs;
    let previousCode: string | undefined;
    let previousError: string | undefined;
    let upgraded = false;

    for (let attempt = 0; attempt < maxAttempts(); attempt += 1) {
      try {
        const code = await generateManimSceneCode({ segment, targetDurationMs: durationMs, previousCode, previousError });
        previousCode = code;
        if (!looksLikeValidScene(code)) { previousError = "The scene must define class GeneratedScene(Scene) with a construct method."; continue; }
        const rendered = await renderCustomScene(code, segment.narration, durationMs);
        await setSegmentStatus(lessonId, segment.id, "complete", {
          videoUrl: rendered.videoUrl,
          posterUrl: rendered.posterUrl,
          captionsUrl: rendered.captionsUrl,
          durationMs: rendered.durationMs,
          checksum: rendered.checksum,
          renderMode: "manim",
        });
        upgraded = true;
        break;
      } catch (error) {
        previousError = error instanceof CustomRenderError ? error.message : (error as Error).message;
        // If the renderer became unreachable, stop retrying (and stop the whole
        // upgrade) rather than paying for codegen that cannot render.
        if (!(await isRendererReachable())) { rendererAlive = false; break; }
        // Otherwise keep previousCode so the model can fix its own scene.
      }
    }

    if (!upgraded) await setSegmentStatus(lessonId, segment.id, "failed");
  }
}
