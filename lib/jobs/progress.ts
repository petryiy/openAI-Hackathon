import { PIPELINE_STAGES, type GenerationJob } from "@/lib/jobs/schema";

export function processingJobView(
  job: GenerationJob,
  now = Date.now(),
): GenerationJob {
  const startedAt = Date.parse(job.processingStartedAt ?? job.updatedAt);
  const elapsed = Math.max(0, now - startedAt);
  const stageIndex = elapsed >= 60_000 ? 5 : 4;
  const progress = Math.min(94, 76 + Math.floor(elapsed / 15_000) * 2);
  const at = new Date(now).toISOString();

  return {
    ...job,
    stageIndex,
    progress,
    stageHistory: PIPELINE_STAGES.slice(0, stageIndex + 1).map((stage, index) => ({
      stage,
      status: index === stageIndex ? ("active" as const) : ("complete" as const),
      at,
    })),
  };
}
