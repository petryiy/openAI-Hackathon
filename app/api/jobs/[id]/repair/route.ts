import { NextResponse } from "next/server";
import {
  classifyGenerationError,
  getSafeModelError,
} from "@/lib/ai/provider";
import { repairGeneratedEpisode } from "@/lib/episode/repair";
import { PIPELINE_STAGES, type GenerationJob } from "@/lib/jobs/schema";
import {
  readEpisodeDraft,
  readJob,
  saveEpisode,
  saveJob,
} from "@/lib/storage/local-store";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const job = await readJob(id);
  if (!job) {
    return NextResponse.json(
      { error: { message: "Generation job not found." } },
      { status: 404 },
    );
  }
  if (!job.draftId) {
    return NextResponse.json(
      { error: { message: "No saved draft is available to repair." } },
      { status: 409 },
    );
  }

  const draft = await readEpisodeDraft(job.draftId);
  if (!draft) {
    return NextResponse.json(
      { error: { message: "The saved draft could not be found." } },
      { status: 404 },
    );
  }

  try {
    const repaired = repairGeneratedEpisode(draft);
    const episode = await saveEpisode(repaired.episode);
    const completedAt = new Date().toISOString();
    const complete: GenerationJob = {
      ...job,
      status: "complete",
      stageIndex: 5,
      progress: 100,
      episodeId: episode.id,
      repairHistory: repaired.repairs,
      updatedAt: completedAt,
      stageHistory: PIPELINE_STAGES.map((stage) => ({
        stage,
        status: "complete" as const,
        at: completedAt,
      })),
      error: undefined,
    };
    await saveJob(complete);
    return NextResponse.json(complete);
  } catch (error) {
    console.error(
      "Episode draft repair failed",
      JSON.stringify(getSafeModelError(error)),
    );
    return NextResponse.json(
      { error: classifyGenerationError(error) },
      { status: 422 },
    );
  }
}
