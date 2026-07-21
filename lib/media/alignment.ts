import { z } from "zod";

const RawAlignmentSchema = z.object({
  characters: z.array(z.string()),
  character_start_times_seconds: z.array(z.number()),
  character_end_times_seconds: z.array(z.number()),
}).loose();

const WithTimestampsPayloadSchema = z.object({
  alignment: RawAlignmentSchema.nullish(),
  normalized_alignment: RawAlignmentSchema.nullish(),
}).loose();

export type CharacterAlignment = {
  characters: string[];
  startTimesMs: number[];
  endTimesMs: number[];
};

export type NarrationAlignment = {
  original: CharacterAlignment | null;
  normalized: CharacterAlignment | null;
};

function toCharacterAlignment(raw: z.infer<typeof RawAlignmentSchema> | null | undefined): CharacterAlignment | null {
  if (!raw) return null;
  const count = Math.min(raw.characters.length, raw.character_start_times_seconds.length, raw.character_end_times_seconds.length);
  if (count === 0) return null;
  return {
    characters: raw.characters.slice(0, count),
    startTimesMs: raw.character_start_times_seconds.slice(0, count).map((seconds) => Math.round(seconds * 1_000)),
    endTimesMs: raw.character_end_times_seconds.slice(0, count).map((seconds) => Math.round(seconds * 1_000)),
  };
}

export function parseElevenLabsAlignment(payload: unknown): NarrationAlignment | null {
  const parsed = WithTimestampsPayloadSchema.safeParse(payload);
  if (!parsed.success) return null;
  const alignment = {
    original: toCharacterAlignment(parsed.data.alignment),
    normalized: toCharacterAlignment(parsed.data.normalized_alignment),
  };
  return alignment.original || alignment.normalized ? alignment : null;
}

export function alignmentDurationMs(alignment: NarrationAlignment): number | null {
  const source = alignment.original ?? alignment.normalized;
  if (!source) return null;
  return source.endTimesMs[source.endTimesMs.length - 1] ?? null;
}

export type WordTiming = { word: string; startMs: number; endMs: number };

export function wordTimings(alignment: CharacterAlignment): WordTiming[] {
  const words: WordTiming[] = [];
  let current: WordTiming | null = null;
  for (let index = 0; index < alignment.characters.length; index += 1) {
    const character = alignment.characters[index];
    if (/\s/.test(character)) {
      if (current) { words.push(current); current = null; }
      continue;
    }
    if (current) {
      current.word += character;
      current.endMs = alignment.endTimesMs[index];
    } else {
      current = { word: character, startMs: alignment.startTimesMs[index], endMs: alignment.endTimesMs[index] };
    }
  }
  if (current) words.push(current);
  return words;
}

/**
 * Resolve a narration anchor phrase to a start time in milliseconds. The
 * anchor indexes into the ORIGINAL narration text, so the original alignment
 * is authoritative; the normalized alignment covers different characters
 * ("2x" spoken as "two x") and cannot be indexed by narration offset. When no
 * usable alignment exists, fall back to proportional placement.
 */
export function resolveAnchorTimeMs(
  narration: string,
  anchorText: string,
  alignment: NarrationAlignment | null,
  durationMs: number,
): number {
  const offset = narration.toLowerCase().indexOf(anchorText.toLowerCase());
  const safeOffset = offset >= 0 ? offset : 0;
  const original = alignment?.original;
  if (original && safeOffset < original.startTimesMs.length) {
    return original.startTimesMs[safeOffset];
  }
  if (narration.length === 0) return 0;
  return Math.round((safeOffset / narration.length) * durationMs);
}
