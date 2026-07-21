import { randomUUID } from "node:crypto";
import { after, NextResponse } from "next/server";
import { z } from "zod";
import { buildDerivativeLesson, isDerivativeScope, UnsupportedCalculusScopeError } from "@/lib/lesson/builder";
import { LESSON_PIPELINE_STAGES, type LessonJob } from "@/lib/lesson/jobs";
import { saveLesson, saveLessonJob } from "@/lib/storage/local-store";
import { renderLessonAssets, verifyLessonMath } from "@/lib/media/manim-client";
import { generateLessonNarrationAssets } from "@/lib/media/elevenlabs-client";
import { planDerivativeLessonLanguage } from "@/lib/ai/lesson-provider";
import { classifyGenerationError } from "@/lib/ai/provider";
import { processGenericLessonJob } from "@/lib/lesson/generic-pipeline";

export const runtime = "nodejs";

const MAX_PDF_BYTES = 20 * 1024 * 1024;

const JsonRequestSchema = z.object({
  sourceInput: z.string().trim().min(12).max(5_000),
  locale: z.string().trim().default("en"),
  level: z.enum(["secondary", "early_university"]).default("secondary"),
}).strict();

type ParsedRequest =
  | { ok: true; sourceInput: string; level: "secondary" | "early_university"; pdf: File | null }
  | { ok: false; status: number; code: string; message: string };

async function parseRequest(request: Request): Promise<ParsedRequest> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData().catch(() => null);
    if (!form) return { ok: false, status: 400, code: "INVALID_SOURCE", message: "Could not read the uploaded form." };
    const pdfField = form.get("pdf");
    const pdf = pdfField instanceof File && pdfField.size > 0 ? pdfField : null;
    if (pdf) {
      const isPdf = pdf.type === "application/pdf" || pdf.name.toLowerCase().endsWith(".pdf");
      if (!isPdf) return { ok: false, status: 400, code: "INVALID_PDF", message: "Attach a PDF file." };
      if (pdf.size > MAX_PDF_BYTES) return { ok: false, status: 400, code: "PDF_TOO_LARGE", message: "The PDF must be 20 MB or smaller." };
    }
    const rawSource = String(form.get("sourceInput") ?? "").trim();
    const level = form.get("level") === "early_university" ? "early_university" : "secondary";
    // With a PDF attached, text is optional; without one, require a real question.
    const sourceInput = rawSource || (pdf ? "Teach the most important concept from the attached document at my level." : "");
    if (!pdf && sourceInput.length < 12) return { ok: false, status: 400, code: "INVALID_SOURCE", message: "Enter a clear question, or attach a PDF." };
    if (sourceInput.length > 5_000) return { ok: false, status: 400, code: "INVALID_SOURCE", message: "The question is too long." };
    return { ok: true, sourceInput, level, pdf };
  }
  const parsed = JsonRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return { ok: false, status: 400, code: "INVALID_SOURCE", message: "Enter a clear question in English." };
  if (parsed.data.locale !== "en") return { ok: false, status: 400, code: "UNSUPPORTED_LOCALE", message: "This lesson generator currently supports English input and output only." };
  return { ok: true, sourceInput: parsed.data.sourceInput, level: parsed.data.level, pdf: null };
}

export async function POST(request: Request) {
  const parsed = await parseRequest(request);
  if (!parsed.ok) return NextResponse.json({ error: { code: parsed.code, message: parsed.message } }, { status: parsed.status });
  if (/[㐀-鿿]/u.test(parsed.sourceInput)) {
    return NextResponse.json({ error: { code: "UNSUPPORTED_LOCALE", message: "This lesson generator currently supports English input and output only." } }, { status: 400 });
  }

  const id = randomUUID().replace(/-/g, "");
  const now = new Date().toISOString();
  // A PDF, or any input outside the supported one-variable derivative scope,
  // routes to the generic whiteboard pipeline. Clear derivative questions keep
  // the flagship template pipeline.
  const mode = !parsed.pdf && isDerivativeScope(parsed.sourceInput) ? "derivative" : "generic";
  const baseJob: LessonJob = {
    id, status: "processing", sourceInput: parsed.sourceInput, locale: "en", level: parsed.level,
    stageIndex: 0, progress: 4, createdAt: now, updatedAt: now, mode,
    ...(parsed.pdf ? { pdfFileName: parsed.pdf.name } : {}),
  };
  await saveLessonJob(baseJob);

  if (mode === "generic") {
    const pdf = parsed.pdf;
    after(() => processGenericLessonJob(baseJob, pdf));
  } else {
    after(() => processDerivativeLessonJob(baseJob));
  }
  return NextResponse.json({ jobId: id }, { status: 202 });
}

async function processDerivativeLessonJob(job: LessonJob) {
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
    // A derivative-looking question that falls outside the supported grammar is
    // handed to the generic whiteboard pipeline instead of being rejected.
    if (error instanceof UnsupportedCalculusScopeError) {
      await saveLessonJob({ ...currentJob, mode: "generic", stageIndex: 0, progress: 4, updatedAt: new Date().toISOString() });
      await processGenericLessonJob({ ...currentJob, mode: "generic" }, null);
      return;
    }
    const providerFailure = classifyGenerationError(error);
    await saveLessonJob({
      ...currentJob,
      status: "error",
      updatedAt: new Date().toISOString(),
      error: {
        code: providerFailure?.code ?? "LESSON_GENERATION_FAILED",
        message: providerFailure?.message ?? "Lesson generation failed. You can retry safely or use the seeded derivative lesson.",
        recoverable: providerFailure?.recoverable ?? true,
      },
    });
  }
}
