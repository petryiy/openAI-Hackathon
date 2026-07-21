import { describe, expect, it } from "vitest";
import { alignmentDurationMs, parseElevenLabsAlignment, resolveAnchorTimeMs, wordTimings } from "@/lib/media/alignment";

const payload = {
  audio_base64: "ignored",
  alignment: {
    characters: ["t", "w", "o", " ", "x"],
    character_start_times_seconds: [0, 0.1, 0.2, 0.3, 0.4],
    character_end_times_seconds: [0.1, 0.2, 0.3, 0.4, 0.55],
  },
  normalized_alignment: {
    characters: ["t", "w", "o", " ", "e", "k", "s"],
    character_start_times_seconds: [0, 0.1, 0.2, 0.3, 0.4, 0.45, 0.5],
    character_end_times_seconds: [0.1, 0.2, 0.3, 0.4, 0.45, 0.5, 0.55],
  },
};

describe("elevenlabs alignment parsing", () => {
  it("parses both alignments into millisecond timelines", () => {
    const alignment = parseElevenLabsAlignment(payload);
    expect(alignment).not.toBeNull();
    expect(alignment!.original!.startTimesMs).toEqual([0, 100, 200, 300, 400]);
    expect(alignment!.normalized!.characters).toHaveLength(7);
  });

  it("returns null for malformed payloads", () => {
    expect(parseElevenLabsAlignment({ alignment: { characters: "no" } })).toBeNull();
    expect(parseElevenLabsAlignment(null)).toBeNull();
    expect(parseElevenLabsAlignment({})).toBeNull();
  });

  it("reads the audio duration from the last character end time", () => {
    const alignment = parseElevenLabsAlignment(payload)!;
    expect(alignmentDurationMs(alignment)).toBe(550);
  });

  it("groups characters into word timings", () => {
    const alignment = parseElevenLabsAlignment(payload)!;
    const words = wordTimings(alignment.original!);
    expect(words).toEqual([
      { word: "two", startMs: 0, endMs: 300 },
      { word: "x", startMs: 400, endMs: 550 },
    ]);
  });
});

describe("anchor resolution", () => {
  const narration = "two x";
  const alignment = parseElevenLabsAlignment(payload);

  it("uses the original alignment for anchor offsets", () => {
    expect(resolveAnchorTimeMs(narration, "x", alignment, 5_000)).toBe(400);
    expect(resolveAnchorTimeMs(narration, "TWO", alignment, 5_000)).toBe(0);
  });

  it("falls back to proportional time without an alignment", () => {
    expect(resolveAnchorTimeMs(narration, "x", null, 5_000)).toBe(Math.round((4 / 5) * 5_000));
  });

  it("treats an anchor that is not in the narration as the segment start", () => {
    expect(resolveAnchorTimeMs(narration, "missing phrase", alignment, 5_000)).toBe(0);
  });
});
