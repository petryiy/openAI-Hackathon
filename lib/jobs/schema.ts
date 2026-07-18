import { z } from "zod";

export const PIPELINE_STAGES = [
  "Understanding the concept",
  "Checking the solution",
  "Turning the concept into story rules",
  "Planning diagnostic choices",
  "Creating scenes and voices",
  "Rendering visual explanations",
] as const;

export const GenerationJobSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  status: z.enum(["pending", "processing", "complete", "error"]),
  sourceInput: z.string(),
  subject: z.string(),
  level: z.string(),
  genre: z.enum(["sci_fi", "detective"]),
  language: z.enum(["en", "zh"]),
  mode: z.enum(["seeded", "openai", "requires_key"]),
  stageIndex: z.number().int().min(0).max(5),
  progress: z.number().min(0).max(100),
  stageHistory: z.array(
    z.object({ stage: z.string(), status: z.enum(["complete", "active"]), at: z.string() }),
  ),
  processingStartedAt: z.string().optional(),
  generationDurationMs: z.number().int().nonnegative().optional(),
  draftId: z.string().optional(),
  repairHistory: z
    .array(z.object({ code: z.string(), message: z.string() }))
    .optional(),
  episodeId: z.string().optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      recoverable: z.boolean(),
    })
    .optional(),
});

export type GenerationJob = z.infer<typeof GenerationJobSchema>;
