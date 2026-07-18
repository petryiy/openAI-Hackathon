import { describe, expect, it } from "vitest";
import { processingJobView } from "@/lib/jobs/progress";
import type { GenerationJob } from "@/lib/jobs/schema";

const startedAt = "2026-07-18T10:00:00.000Z";

function processingJob(): GenerationJob {
  return {
    id: "job-progress",
    createdAt: startedAt,
    updatedAt: startedAt,
    processingStartedAt: startedAt,
    status: "processing",
    sourceInput: "A sufficiently clear probability question",
    subject: "Probability",
    level: "Secondary school",
    genre: "detective",
    language: "en",
    mode: "openai",
    stageIndex: 4,
    progress: 76,
    stageHistory: [],
  };
}

describe("processing job progress", () => {
  it("advances visible progress without changing persisted timestamps", () => {
    const job = processingJob();
    const view = processingJobView(job, Date.parse(startedAt) + 45_000);

    expect(view.progress).toBe(82);
    expect(view.stageIndex).toBe(4);
    expect(view.updatedAt).toBe(job.updatedAt);
    expect(view.stageHistory.at(-1)?.status).toBe("active");
  });

  it("moves to rendering and caps progress before publication", () => {
    const view = processingJobView(
      processingJob(),
      Date.parse(startedAt) + 10 * 60_000,
    );

    expect(view.stageIndex).toBe(5);
    expect(view.progress).toBe(94);
    expect(view.stageHistory.at(-1)?.stage).toBe("Rendering visual explanations");
  });
});
