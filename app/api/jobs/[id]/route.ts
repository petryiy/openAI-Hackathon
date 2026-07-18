import { NextResponse } from "next/server";
import {
  classifyGenerationError,
  generateEpisodeSpec,
  getSafeModelError,
} from "@/lib/ai/provider";
import { MOONBASE_EPISODE_ID } from "@/lib/episode/moonbase";
import { repairGeneratedEpisode } from "@/lib/episode/repair";
import { processingJobView } from "@/lib/jobs/progress";
import { PIPELINE_STAGES, type GenerationJob } from "@/lib/jobs/schema";
import {
  readJob,
  saveEpisode,
  saveEpisodeDraft,
  saveJob,
} from "@/lib/storage/local-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function stagedJob(job: GenerationJob, elapsed: number): GenerationJob {
  const stageIndex = Math.min(5, Math.floor(elapsed / 420));
  const progress = Math.min(94, 8 + stageIndex * 16 + Math.floor((elapsed % 420) / 42));
  const at = new Date().toISOString();
  return {
    ...job,
    stageIndex,
    progress,
    updatedAt: at,
    stageHistory: PIPELINE_STAGES.slice(0, stageIndex + 1).map((stage, index) => ({
      stage,
      status: index === stageIndex ? ("active" as const) : ("complete" as const),
      at,
    })),
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const existing = await readJob(id);
  if (!existing) {
    return NextResponse.json({ error: { message: "Generation job not found." } }, { status: 404 });
  }
  if (existing.status === "complete" || existing.status === "error") {
    return NextResponse.json(existing);
  }
  if (existing.status === "processing") {
    return NextResponse.json(processingJobView(existing));
  }

  const elapsed = Date.now() - Date.parse(existing.createdAt);
  if (elapsed < 2520) {
    const updated = stagedJob(existing, elapsed);
    await saveJob(updated);
    return NextResponse.json(updated);
  }

  if (existing.mode === "seeded") {
    const complete: GenerationJob = {
      ...stagedJob(existing, elapsed),
      status: "complete",
      stageIndex: 5,
      progress: 100,
      episodeId: MOONBASE_EPISODE_ID,
      updatedAt: new Date().toISOString(),
      stageHistory: PIPELINE_STAGES.map((stage) => ({
        stage,
        status: "complete" as const,
        at: new Date().toISOString(),
      })),
    };
    await saveJob(complete);
    return NextResponse.json(complete);
  }

  if (existing.mode === "requires_key") {
    const pausedAt = new Date().toISOString();
    const failed: GenerationJob = {
      ...existing,
      status: "error",
      stageIndex: 1,
      progress: 28,
      updatedAt: pausedAt,
      stageHistory: [
        { stage: PIPELINE_STAGES[0], status: "complete", at: pausedAt },
        { stage: PIPELINE_STAGES[1], status: "active", at: pausedAt },
      ],
      error: {
        code: "OPENAI_API_KEY_REQUIRED",
        message:
          "New-topic generation is ready but not connected. Add OPENAI_API_KEY to .env.local, restart the app, and retry—or use the Moonbase sample now.",
        recoverable: true,
      },
    };
    await saveJob(failed);
    return NextResponse.json(failed);
  }

  const processingStartedAt = new Date().toISOString();
  const processing: GenerationJob = {
    ...existing,
    status: "processing",
    stageIndex: 4,
    progress: 76,
    processingStartedAt,
    updatedAt: processingStartedAt,
  };
  await saveJob(processing);

  let draftId: string | undefined;
  try {
    const generated = await generateEpisodeSpec({
      sourceInput: existing.sourceInput,
      subject: existing.subject,
      level: existing.level,
      genre: existing.genre,
      language: existing.language,
    });
    const generatedWithId = { ...generated, id: `episode-${existing.id}` };
    const draft = await saveEpisodeDraft(generatedWithId);
    draftId = draft.id;
    const repaired = repairGeneratedEpisode(draft);
    const episode = await saveEpisode(repaired.episode);
    const completedAt = new Date().toISOString();
    const complete: GenerationJob = {
      ...processing,
      status: "complete",
      stageIndex: 5,
      progress: 100,
      draftId,
      repairHistory: repaired.repairs,
      episodeId: episode.id,
      generationDurationMs:
        Date.parse(completedAt) - Date.parse(processingStartedAt),
      updatedAt: completedAt,
      stageHistory: PIPELINE_STAGES.map((stage) => ({
        stage,
        status: "complete" as const,
        at: new Date().toISOString(),
      })),
    };
    await saveJob(complete);
    return NextResponse.json(complete);
  } catch (error) {
    console.error(
      "Episode generation failed",
      JSON.stringify(getSafeModelError(error)),
    );
    const publicError = classifyGenerationError(error);
    const failed: GenerationJob = {
      ...processing,
      status: "error",
      stageIndex: draftId ? 5 : processing.stageIndex,
      progress: draftId ? 94 : processing.progress,
      draftId,
      generationDurationMs: Date.now() - Date.parse(processingStartedAt),
      updatedAt: new Date().toISOString(),
      error: publicError,
    };
    await saveJob(failed);
    return NextResponse.json(failed);
  }
}
