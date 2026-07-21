import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { alignmentDurationMs, parseElevenLabsAlignment } from "@/lib/media/alignment";
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

type SynthesizedNarration = { audioUrl: string; alignmentUrl: string | null; durationMs: number };

async function synthesizeNarration(text: string, config: ElevenLabsConfig): Promise<SynthesizedNarration> {
  const checksum = createHash("sha256")
    .update(JSON.stringify({ provider: "elevenlabs", version: 2, voiceId: config.voiceId, modelId: config.modelId, text, settings: VOICE_SETTINGS }))
    .digest("hex");
  const directory = path.join(process.cwd(), ".data", "lesson-assets", checksum);
  const audioPath = path.join(directory, "narration.mp3");
  const alignmentPath = path.join(directory, "alignment.json");
  const audioUrl = `/lesson-assets/${checksum}/narration.mp3`;

  try {
    const cached = await readFile(audioPath);
    const cachedAlignment = await readFile(alignmentPath).then((buffer) => parseElevenLabsAlignment(JSON.parse(buffer.toString()))).catch(() => null);
    return {
      audioUrl,
      alignmentUrl: cachedAlignment ? `/lesson-assets/${checksum}/alignment.json` : null,
      durationMs: (cachedAlignment && alignmentDurationMs(cachedAlignment)) || byteDurationMs(cached),
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  // The with-timestamps endpoint returns base64 audio plus character-level
  // alignment for both the original and normalized text, which drives caption
  // highlighting and animation cues.
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(config.voiceId)}/with-timestamps?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "xi-api-key": config.apiKey },
      body: JSON.stringify(elevenLabsRequestBody(text, config.modelId)),
      signal: AbortSignal.timeout(90_000),
    },
  );
  if (!response.ok) throw new Error(`ElevenLabs narration request failed with status ${response.status}.`);

  const payload = await response.json() as { audio_base64?: string };
  if (!payload.audio_base64) throw new Error("ElevenLabs returned no audio.");
  const audio = Buffer.from(payload.audio_base64, "base64");
  if (audio.byteLength < 1_000) throw new Error("ElevenLabs returned an invalid narration asset.");

  const alignment = parseElevenLabsAlignment(payload);
  await mkdir(directory, { recursive: true });
  await writeFile(audioPath, audio);
  let alignmentUrl: string | null = null;
  if (alignment) {
    await writeFile(alignmentPath, JSON.stringify(payload));
    alignmentUrl = `/lesson-assets/${checksum}/alignment.json`;
  }
  return {
    audioUrl,
    alignmentUrl,
    durationMs: (alignment && alignmentDurationMs(alignment)) || byteDurationMs(audio),
  };
}

function byteDurationMs(audio: Buffer) {
  // Fallback when no alignment is available: estimate from the constant 128 kbps
  // MP3 bitrate. Kept wide so v3 segments (up to 90 s) are not clipped here.
  return Math.max(2_000, Math.min(120_000, Math.round((audio.byteLength * 8 / 128_000) * 1_000)));
}

export async function generateLessonNarrationAssets<T extends LessonSpec>(lesson: T): Promise<T> {
  const config = configFromEnvironment();
  if (!config) return lesson;

  // v3 whiteboard segments may legitimately run up to 90 s; the template
  // lessons stay within their existing 30 s ceiling.
  const maxDurationMs = lesson.schemaVersion === 3 ? 90_000 : 30_000;
  const assets = []; const durations = new Map<string, number>();
  for (const segment of lesson.segments) {
    const current = lesson.assets.segments.find((asset) => asset.segmentId === segment.id)!;
    if (current.audioUrl) {
      assets.push(current);
      continue;
    }
    try {
      const narration = await synthesizeNarration(segment.narration, config);
      const durationMs = Math.max(4_000, Math.min(maxDurationMs, narration.durationMs));
      durations.set(segment.id, durationMs);
      assets.push({ ...current, audioUrl: narration.audioUrl, alignmentUrl: narration.alignmentUrl, durationMs });
    } catch {
      // Captions and deterministic visuals keep the lesson usable if the provider is unavailable.
      assets.push(current);
    }
  }
  return {
    ...lesson,
    segments: lesson.segments.map((segment) => durations.has(segment.id) ? { ...segment, durationMs: durations.get(segment.id)! } : segment),
    assets: { segments: assets },
  } as T;
}
