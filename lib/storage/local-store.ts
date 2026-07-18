import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { EpisodeSpecSchema, type EpisodeSpec, validateEpisodeSemantics } from "@/lib/episode/schema";
import { GenerationJobSchema, type GenerationJob } from "@/lib/jobs/schema";

const root = path.join(process.cwd(), ".data");

function safeId(id: string) {
  if (!/^[a-zA-Z0-9-]+$/.test(id)) throw new Error("Invalid storage id.");
  return id;
}

async function writeJson(folder: string, id: string, value: unknown) {
  const directory = path.join(root, folder);
  await mkdir(directory, { recursive: true });
  await writeFile(
    path.join(directory, `${safeId(id)}.json`),
    JSON.stringify(value, null, 2),
    "utf8",
  );
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
