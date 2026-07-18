import { describe, expect, it } from "vitest";
import { moonbaseEpisode } from "@/lib/episode/moonbase";
import { EpisodeSpecSchema } from "@/lib/episode/schema";

describe("Moonbase EpisodeSpec", () => {
  it("passes the shared schema and contains exactly two choices", () => {
    expect(EpisodeSpecSchema.parse(moonbaseEpisode)).toEqual(moonbaseEpisode);
    expect(moonbaseEpisode.choiceNodes).toHaveLength(2);
  });

  it("keeps every branch short and reconvergent", () => {
    const branchScenes = moonbaseEpisode.scenes.filter((scene) => scene.kind === "branch");
    expect(branchScenes.length).toBeGreaterThanOrEqual(6);
    for (const scene of branchScenes) {
      expect(scene.nextSceneIds).toHaveLength(1);
      expect(["second-decision", "transfer"]).toContain(scene.nextSceneIds[0]);
    }
  });

  it("ships deterministic teaching visuals and passing quality gates", () => {
    expect(
      moonbaseEpisode.visualizations.filter((visual) =>
        ["svg", "canvas", "manim"].includes(visual.renderer),
      ).length,
    ).toBeGreaterThanOrEqual(2);
    for (const gate of moonbaseEpisode.qualityGates) {
      expect(Math.min(...Object.values(gate.scores))).toBeGreaterThanOrEqual(4);
    }
  });
});
