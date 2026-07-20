import { describe, expect, it } from "vitest";
import { moonbaseEpisode } from "@/lib/episode/moonbase";
import { getBeatDurationMs, getSpokenText } from "@/lib/player/playback";

describe("episode playback timing", () => {
  const scene = moonbaseEpisode.scenes[0];

  it("returns the current spoken line", () => {
    expect(getSpokenText(scene, 0)).toBe(scene.dialogue[0]?.text ?? scene.narration ?? "");
  });

  it("keeps autoplay beats in the readable range", () => {
    expect(getBeatDurationMs(moonbaseEpisode, scene, 0)).toBeGreaterThanOrEqual(2_800);
    expect(getBeatDurationMs(moonbaseEpisode, scene, 0)).toBeLessThanOrEqual(8_000);
  });
});
