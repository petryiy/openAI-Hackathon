import { describe, expect, it } from "vitest";
import {
  createEpisodePayload,
  getSignalState,
  isPdfReference,
  LEVELS,
  SUBJECTS,
} from "@/lib/create/episode-source";

describe("episode source controls", () => {
  it("exposes only the approved subjects and levels", () => {
    expect(SUBJECTS).toEqual(["Calculus", "Physics", "Probability"]);
    expect(LEVELS).toEqual(["Middle school", "Secondary school", "Early university"]);
  });

  it("does not mark short or whitespace-only sources ready", () => {
    expect(getSignalState("   ")).toBe("awaiting");
    expect(getSignalState("too short")).toBe("incomplete");
    expect(getSignalState("A complete source question")).toBe("ready");
  });

  it("always sends English and never includes the local PDF reference", () => {
    expect(createEpisodePayload({
      sourceInput: "Why does the derivative describe instantaneous change?",
      subject: "Calculus",
      level: "Early university",
      genre: "detective",
    })).toEqual({
      sourceInput: "Why does the derivative describe instantaneous change?",
      subject: "Calculus",
      level: "Early university",
      genre: "detective",
      language: "en",
    });
  });

  it("accepts PDF references by MIME type or extension", () => {
    expect(isPdfReference({ name: "reference", type: "application/pdf" })).toBe(true);
    expect(isPdfReference({ name: "reference.PDF", type: "" })).toBe(true);
    expect(isPdfReference({ name: "diagram.png", type: "image/png" })).toBe(false);
  });
});
