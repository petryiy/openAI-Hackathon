import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { EpisodeSpecSchema, type EpisodeSpec, validateEpisodeSemantics } from "@/lib/episode/schema";
import { GenerationJobSchema, type GenerationJob } from "@/lib/jobs/schema";
import { LessonSpecSchema, type LessonSpec } from "@/lib/lesson/schema";
import { LessonJobSchema, type LessonJob } from "@/lib/lesson/jobs";

const root = path.join(process.cwd(), ".data");

function safeId(id: string) {
  if (!/^[a-zA-Z0-9-]+$/.test(id)) throw new Error("Invalid storage id.");
  return id;
}

async function writeJson(folder: string, id: string, value: unknown) {
  const directory = path.join(root, folder);
  await mkdir(directory, { recursive: true });
  // Write then rename so a concurrent reader (e.g. the Track B poller) never
  // observes a half-written lesson file.
  const target = path.join(directory, `${safeId(id)}.json`);
  const temporary = `${target}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(value, null, 2), "utf8");
  await rename(temporary, target);
}

async function readJson(folder: string, id: string) {
  try {
    const content = await readFile(
      path.join(root, folder, `${safeId(id)}.json`),
      "utf8",
    );
    return JSON.parse(content) as unknown;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function saveJob(job: GenerationJob) {
  const parsed = GenerationJobSchema.parse(job);
  await writeJson("jobs", parsed.id, parsed);
  return parsed;
}

export async function readJob(id: string) {
  const value = await readJson("jobs", id);
  return value ? GenerationJobSchema.parse(value) : null;
}

export async function saveEpisode(episode: EpisodeSpec) {
  const parsed = validateEpisodeSemantics(EpisodeSpecSchema.parse(episode));
  await writeJson("episodes", parsed.id, parsed);
  return parsed;
}

export async function saveEpisodeDraft(episode: EpisodeSpec) {
  const parsed = EpisodeSpecSchema.parse(episode);
  await writeJson("drafts", parsed.id, parsed);
  return parsed;
}

export async function readEpisodeDraft(id: string) {
  const value = await readJson("drafts", id);
  return value ? EpisodeSpecSchema.parse(value) : null;
}

export async function readEpisode(id: string) {
  const value = await readJson("episodes", id);
  return value ? EpisodeSpecSchema.parse(value) : null;
}

export async function saveLesson(lesson: LessonSpec) {
  const parsed = LessonSpecSchema.parse(lesson);
  await writeJson("lessons", parsed.id, parsed);
  return parsed;
}

export async function readLesson(id: string) {
  const value = await readJson("lessons", id);
  return value ? LessonSpecSchema.parse(value) : null;
}

export async function saveLessonJob(job: LessonJob) {
  const parsed = LessonJobSchema.parse(job);
  await writeJson("lesson-jobs", parsed.id, parsed);
  return parsed;
}

export async function readLessonJob(id: string) {
  const value = await readJson("lesson-jobs", id);
  return value ? LessonJobSchema.parse(value) : null;
}
