import { NextResponse } from "next/server";
import { generateEpisodeSpec, ModelConfigurationError } from "@/lib/ai/provider";
import { MOONBASE_EPISODE_ID } from "@/lib/episode/moonbase";
import { PIPELINE_STAGES, type GenerationJob } from "@/lib/jobs/schema";
import { readJob, saveEpisode, saveJob } from "@/lib/storage/local-store";

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
    return NextResponse.json(existing);
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

  const processing: GenerationJob = {
    ...existing,
    status: "processing",
    stageIndex: 4,
    progress: 76,
    updatedAt: new Date().toISOString(),
  };
  await saveJob(processing);

  try {
    const generated = await generateEpisodeSpec({
      sourceInput: existing.sourceInput,
      subject: existing.subject,
      level: existing.level,
      genre: existing.genre,
      language: existing.language,
    });
    const episode = await saveEpisode({ ...generated, id: `episode-${existing.id}` });
    const complete: GenerationJob = {
      ...processing,
      status: "complete",
      stageIndex: 5,
      progress: 100,
      episodeId: episode.id,
      updatedAt: new Date().toISOString(),
      stageHistory: PIPELINE_STAGES.map((stage) => ({
        stage,
        status: "complete" as const,
        at: new Date().toISOString(),
      })),
    };
    await saveJob(complete);
    return NextResponse.json(complete);
  } catch (error) {
    const configurationError = error instanceof ModelConfigurationError;
    const failed: GenerationJob = {
      ...processing,
      status: "error",
      updatedAt: new Date().toISOString(),
      error: {
        code: configurationError ? error.code : "GENERATION_FAILED",
        message: configurationError
          ? error.message
          : "The episode did not pass structured validation. Refine the source question and retry.",
        recoverable: true,
      },
    };
    await saveJob(failed);
    return NextResponse.json(failed);
  }
}
