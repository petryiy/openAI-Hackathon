import { LESSON_PIPELINE_STAGES, type LessonJob } from "@/lib/lesson/jobs";
import { saveLesson, saveLessonJob } from "@/lib/storage/local-store";
import { generateLessonNarrationAssets } from "@/lib/media/elevenlabs-client";
import { classifyGenerationError } from "@/lib/ai/provider";
import { generateGenericLesson, LessonPlanInvalidError, verifyGenericLesson } from "@/lib/ai/generic-lesson-provider";
import { uploadPdfForModel } from "@/lib/ai/file-upload";
import { upgradeLessonWithManim } from "@/lib/lesson/track-b";
import type { LessonSpecV3 } from "@/lib/lesson/schema";

export class LessonVerificationFailedError extends Error {
  code = "LESSON_VERIFICATION_FAILED" as const;
}

/**
 * Generic whiteboard pipeline for any non-derivative topic (and any PDF upload).
 * Reuses the six existing progress stages so the loading UI needs no changes.
 */
export async function processGenericLessonJob(job: LessonJob, pdf: File | null) {
  let currentJob = job;
  const update = (stageIndex: number, progress: number) => {
    currentJob = { ...currentJob, status: "processing", stageIndex, progress, updatedAt: new Date().toISOString() };
    return saveLessonJob(currentJob);
  };

  try {
    await update(0, 10);
    const fileId = pdf ? await uploadPdfForModel(pdf) : undefined;

    await update(1, 28);
    await update(2, 45);
    let lesson = await generateGenericLesson({ sourceInput: job.sourceInput, level: job.level, fileId, lessonId: job.id });

    // Verification: a deterministic numeric-check failure forces one regeneration
    // with the corrections injected; a still-failing recheck blocks publication.
    // Advisory model-verifier notes are recorded but do not force a second pass.
    const verification = await verifyGenericLesson(lesson);
    if (verification.mustRegenerate) {
      const corrected = await generateGenericLesson({
        sourceInput: `${job.sourceInput}\n\nA reviewer found these issues in a prior lesson attempt; make sure the new lesson is correct on each:\n- ${verification.issues.slice(0, 6).join("\n- ")}`,
        level: job.level, fileId, lessonId: job.id,
      });
      const recheck = await verifyGenericLesson(corrected);
      if (recheck.mustRegenerate) throw new LessonVerificationFailedError(`The lesson could not be verified as correct: ${recheck.issues.slice(0, 2).join(" ")}`);
      lesson = { ...corrected, verification: { verdict: "corrected", notes: recheck.notes } };
    } else {
      lesson = { ...lesson, verification: { verdict: verification.notes.length > 0 ? "corrected" : "approved", notes: verification.notes } };
    }

    await update(3, 60);
    const narrated = await generateLessonNarrationAssets(lesson) as LessonSpecV3;

    await update(4, 72);
    // Whiteboard scenes are data, so there is nothing to render here; assets are
    // already renderMode "whiteboard". Track B upgrades them to Manim later.

    await update(5, 92);
    const saved = await saveLesson(narrated);
    await saveLessonJob({ ...currentJob, status: "complete", stageIndex: LESSON_PIPELINE_STAGES.length - 1, progress: 100, lessonId: saved.id, updatedAt: new Date().toISOString() });

    // Track B runs after the lesson is published and the job is complete, so a
    // failure here never blocks the whiteboard lesson the learner already has.
    try { await upgradeLessonWithManim(saved.id); } catch { /* Track A remains — acceptable end state. */ }
  } catch (error) {
    const planInvalid = error instanceof LessonPlanInvalidError;
    const verificationFailed = error instanceof LessonVerificationFailedError;
    const known = planInvalid || verificationFailed;
    const providerFailure = known ? null : classifyGenerationError(error);
    await saveLessonJob({
      ...currentJob,
      status: "error",
      updatedAt: new Date().toISOString(),
      error: {
        code: known ? (error as LessonPlanInvalidError | LessonVerificationFailedError).code : providerFailure?.code ?? "LESSON_GENERATION_FAILED",
        message: known ? (error as Error).message : providerFailure?.message ?? "Lesson generation failed. You can retry safely.",
        recoverable: providerFailure?.recoverable ?? true,
      },
    });
  }
}
