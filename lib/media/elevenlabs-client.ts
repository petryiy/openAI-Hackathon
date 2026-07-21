import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { LessonSpec } from "@/lib/lesson/schema";

export const DEFAULT_ELEVENLABS_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"; // George
export const DEFAULT_ELEVENLABS_MODEL = "eleven_multilingual_v2";

const VOICE_SETTINGS = {
  stability: 0.58,
  similarity_boost: 0.78,
  style: 0.18,
  use_speaker_boost: true,
  speed: 0.96,
} as const;

type ElevenLabsConfig = {
  apiKey: string;
  voiceId: string;
  modelId: string;
};

function configFromEnvironment(): ElevenLabsConfig | null {
  const apiKey = process.env.ELEVEN_LABS?.trim();
  if (!apiKey) return null;
  return {
    apiKey,
    voiceId: process.env.ELEVENLABS_VOICE_ID?.trim() || DEFAULT_ELEVENLABS_VOICE_ID,
    modelId: process.env.ELEVENLABS_MODEL?.trim() || DEFAULT_ELEVENLABS_MODEL,
  };
}

export function elevenLabsRequestBody(text: string, modelId = DEFAULT_ELEVENLABS_MODEL) {
  return {
    text,
    model_id: modelId,
    voice_settings: VOICE_SETTINGS,
  };
}

async function synthesizeNarration(text: string, config: ElevenLabsConfig) {
  const checksum = createHash("sha256")
    .update(JSON.stringify({ provider: "elevenlabs", voiceId: config.voiceId, modelId: config.modelId, text, settings: VOICE_SETTINGS }))
    .digest("hex");
  const directory = path.join(process.cwd(), ".data", "lesson-assets", checksum);
  const filename = path.join(directory, "narration.mp3");

  try {
    await readFile(filename);
    return `/lesson-assets/${checksum}/narration.mp3`;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(config.voiceId)}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "xi-api-key": config.apiKey },
      body: JSON.stringify(elevenLabsRequestBody(text, config.modelId)),
      signal: AbortSignal.timeout(45_000),
    },
  );
  if (!response.ok) throw new Error(`ElevenLabs narration request failed with status ${response.status}.`);

  const audio = Buffer.from(await response.arrayBuffer());
  if (audio.byteLength < 1_000) throw new Error("ElevenLabs returned an invalid narration asset.");
  await mkdir(directory, { recursive: true });
  await writeFile(filename, audio);
  return `/lesson-assets/${checksum}/narration.mp3`;
}

export async function generateLessonNarrationAssets(lesson: LessonSpec) {
  const config = configFromEnvironment();
  if (!config) return lesson;

  const assets = [];
  for (const segment of lesson.segments) {
    const current = lesson.assets.segments.find((asset) => asset.segmentId === segment.id)!;
    if (current.audioUrl) {
      assets.push(current);
      continue;
    }
    try {
      const audioUrl = await synthesizeNarration(segment.narration, config);
      assets.push({ ...current, audioUrl });
    } catch {
      // Captions and deterministic visuals keep the lesson usable if the provider is unavailable.
      assets.push(current);
    }
  }
  return { ...lesson, assets: { segments: assets } };
}
