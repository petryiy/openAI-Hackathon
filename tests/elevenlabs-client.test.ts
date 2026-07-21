import { describe, expect, it } from "vitest";
import { DEFAULT_ELEVENLABS_MODEL, DEFAULT_ELEVENLABS_VOICE_ID, elevenLabsRequestBody } from "@/lib/media/elevenlabs-client";

describe("ElevenLabs narration contract", () => {
  it("uses the reviewed educational narration defaults", () => {
    const request = elevenLabsRequestBody("A tangent is the limiting secant.");
    expect(DEFAULT_ELEVENLABS_VOICE_ID).toBe("JBFqnCBsd6RMkjVDRZzb");
    expect(DEFAULT_ELEVENLABS_MODEL).toBe("eleven_multilingual_v2");
    expect(request).toEqual({
      text: "A tangent is the limiting secant.",
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.58,
        similarity_boost: 0.78,
        style: 0.18,
        use_speaker_boost: true,
        speed: 0.96,
      },
    });
  });
});
