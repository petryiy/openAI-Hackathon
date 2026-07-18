import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { isMoonbaseSource } from "@/lib/episode/moonbase";
import { type GenerationJob } from "@/lib/jobs/schema";
import { saveJob } from "@/lib/storage/local-store";

export const runtime = "nodejs";

const CreateEpisodeSchema = z.object({
  sourceInput: z.string().trim().min(12).max(5000),
  subject: z.string().trim().min(2).max(80).default("Physics"),
  level: z.string().trim().min(2).max(80).default("Secondary school"),
  genre: z.enum(["sci_fi", "detective"]).default("sci_fi"),
  language: z.enum(["en", "zh"]).default("en"),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = CreateEpisodeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_SOURCE",
          message: "Paste a clear question or short note (at least 12 characters).",
          recoverable: true,
          fields: parsed.error.flatten().fieldErrors,
        },
      },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const mode = isMoonbaseSource(parsed.data.sourceInput)
    ? "seeded"
    : process.env.OPENAI_API_KEY
      ? "openai"
      : "requires_key";
  const job: GenerationJob = {
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    status: "pending",
    ...parsed.data,
    mode,
    stageIndex: 0,
    progress: 4,
    stageHistory: [
      { stage: "Understanding the concept", status: "active", at: now },
    ],
  };

  await saveJob(job);
  return NextResponse.json({ jobId: job.id, mode: job.mode }, { status: 202 });
}
