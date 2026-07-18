import { describe, expect, it } from "vitest";
import { zodTextFormat } from "openai/helpers/zod";
import {
  ModelEpisodeSpecSchema,
  modelEpisodeToEpisodeSpec,
} from "@/lib/ai/schema";
import { moonbaseEpisode } from "@/lib/episode/moonbase";
import { validateEpisodeSemantics } from "@/lib/episode/schema";

function moonbaseModelFixture() {
  return {
    ...moonbaseEpisode,
    visualizations: moonbaseEpisode.visualizations.map((visualization) => ({
      ...visualization,
      visualEncoding: {
        ...visualization.visualEncoding,
        colorMeaning: Object.entries(
          visualization.visualEncoding.colorMeaning,
        ).map(([key, meaning]) => ({ key, meaning })),
        motionMeaning: visualization.visualEncoding.motionMeaning
          ? Object.entries(visualization.visualEncoding.motionMeaning).map(
              ([key, meaning]) => ({ key, meaning }),
            )
          : null,
      },
    })),
    qualityGates: moonbaseEpisode.qualityGates.map((gate) => ({
      ...gate,
      scores: Object.entries(gate.scores).map(([criterion, score]) => ({
        criterion,
        score,
      })),
    })),
  };
}

describe("OpenAI EpisodeSpec boundary", () => {
  it("compiles to the strict Structured Outputs schema subset", () => {
    const format = zodTextFormat(ModelEpisodeSpecSchema, "episode_spec");
    const schema = JSON.stringify(format.schema);

    expect(schema).not.toContain("propertyNames");
    expect(schema).not.toContain('"additionalProperties":{"type"');
    expect(
      (format.schema as { properties?: Record<string, unknown> }).properties,
    ).not.toHaveProperty("shots");
  });

  it("converts model entry lists back into the internal EpisodeSpec contract", () => {
    const modelEpisode = ModelEpisodeSpecSchema.parse(moonbaseModelFixture());
    const converted = modelEpisodeToEpisodeSpec(modelEpisode);

    expect(converted.visualizations[0].visualEncoding.colorMeaning).toEqual(
      moonbaseEpisode.visualizations[0].visualEncoding.colorMeaning,
    );
    expect(converted.qualityGates[0].scores).toEqual(
      moonbaseEpisode.qualityGates[0].scores,
    );
    expect(new Set(converted.shots.map((shot) => shot.sceneId))).toEqual(
      new Set(converted.scenes.map((scene) => scene.id)),
    );
    expect(() => validateEpisodeSemantics(converted)).not.toThrow();
  });
});
