import { randomUUID } from "node:crypto";
import { after, NextResponse } from "next/server";
import { z } from "zod";
import { buildDerivativeLesson, UnsupportedCalculusScopeError } from "@/lib/lesson/builder";
import { LESSON_PIPELINE_STAGES, type LessonJob } from "@/lib/lesson/jobs";
import { saveLesson, saveLessonJob } from "@/lib/storage/local-store";
import { renderLessonAssets, verifyLessonMath } from "@/lib/media/manim-client";
import { generateLessonNarrationAssets } from "@/lib/media/elevenlabs-client";
import { planDerivativeLessonLanguage } from "@/lib/ai/lesson-provider";
import { classifyGenerationError } from "@/lib/ai/provider";

export const runtime = "nodejs";

const RequestSchema = z.object({
  sourceInput: z.string().trim().min(12).max(2_000),
  locale: z.string().trim().default("en"),
  level: z.enum(["secondary", "early_university"]).default("secondary"),
}).strict();

export async function POST(request: Request) {
  const parsed = RequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: { code: "INVALID_SOURCE", message: "Enter a clear derivative question or concept in English.", fields: parsed.error.flatten().fieldErrors } }, { status: 400 });
  if (parsed.data.locale !== "en" || /[\u3400-\u9fff]/u.test(parsed.data.sourceInput)) {
    return NextResponse.json({ error: { code: "UNSUPPORTED_LOCALE", message: "This calculus lesson currently supports English input and output only." } }, { status: 400 });
  }
  const id = randomUUID(); const now = new Date().toISOString();
  const baseJob: LessonJob = { id, status: "processing", sourceInput: parsed.data.sourceInput, locale: "en", level: parsed.data.level, stageIndex: 0, progress: 4, createdAt: now, updatedAt: now };
  await saveLessonJob(baseJob);
  after(() => processLessonJob(baseJob));
  return NextResponse.json({ jobId: id }, { status: 202 });
}

async function processLessonJob(job: LessonJob) {
  let currentJob = job;
  const update = (stageIndex: number, progress: number) => {
    currentJob = { ...currentJob, status: "processing", stageIndex, progress, updatedAt: new Date().toISOString() };
    return saveLessonJob(currentJob);
  };
  try {
    await update(0, 10);
    const deterministicDraft = buildDerivativeLesson(job.sourceInput, job.locale);
    await verifyLessonMath(deterministicDraft);
    await update(1, 28);
    await update(2, 45);
    const lessonDraft = deterministicDraft.schemaVersion === 2
      ? await planDerivativeLessonLanguage(deterministicDraft)
      : deterministicDraft;
    await update(3, 60);
    const narratedLesson = await generateLessonNarrationAssets(lessonDraft);
    await update(4, 72);
    const renderedLesson = await renderLessonAssets(narratedLesson);
    await update(5, 92);
    const lesson = await saveLesson(renderedLesson);
    await saveLessonJob({ ...currentJob, status: "complete", stageIndex: LESSON_PIPELINE_STAGES.length - 1, progress: 100, lessonId: lesson.id, updatedAt: new Date().toISOString() });
  } catch (error) {
    const unsupported = error instanceof UnsupportedCalculusScopeError;
    const providerFailure = unsupported ? null : classifyGenerationError(error);
    await saveLessonJob({
      ...currentJob,
      status: "error",
      stageIndex: unsupported ? 0 : currentJob.stageIndex,
      progress: unsupported ? 10 : currentJob.progress,
      updatedAt: new Date().toISOString(),
      error: {
        code: unsupported ? error.code : providerFailure?.code ?? "LESSON_GENERATION_FAILED",
        message: unsupported ? error.message : providerFailure?.message ?? "Lesson generation failed. You can retry safely or use the seeded derivative lesson.",
        recoverable: providerFailure?.recoverable ?? true,
      },
    });
  }
}
