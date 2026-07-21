import { z } from "zod";

export const LESSON_PIPELINE_STAGES = ["Understanding the question", "Verifying the mathematics", "Planning the lesson", "Generating narration", "Rendering visual explanations", "Checking and publishing"] as const;

export const LessonJobSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9-]+$/),
  status: z.enum(["processing", "complete", "error"]),
  sourceInput: z.string(),
  locale: z.literal("en"),
  level: z.enum(["secondary", "early_university"]),
  stageIndex: z.number().int().min(0).max(5),
  progress: z.number().min(0).max(100),
  createdAt: z.string(),
  updatedAt: z.string(),
  lessonId: z.string().optional(),
  mode: z.enum(["derivative", "generic"]).optional(),
  pdfFileName: z.string().optional(),
  error: z.object({ code: z.string(), message: z.string(), recoverable: z.boolean() }).optional(),
}).strict();

export type LessonJob = z.infer<typeof LessonJobSchema>;
