import { z } from "zod";
import {
  EpisodeDraftSchema,
  EpisodeSpecSchema,
  TeachingVisualizationSpecSchema,
  type EpisodeSpec,
} from "@/lib/episode/schema";
import { planEpisodeShots } from "@/lib/episode/shot-planner";

const MeaningEntrySchema = z.object({
  key: z.string(),
  meaning: z.string(),
});

const ModelTeachingVisualizationSpecSchema =
  TeachingVisualizationSpecSchema.extend({
    visualEncoding: z.object({
      emphasis: z.array(z.string()),
      colorMeaning: z.array(MeaningEntrySchema),
      motionMeaning: z.array(MeaningEntrySchema).nullable(),
    }),
  });

const ModelGateSchema = z.object({
  name: z.enum(["script", "pedagogy", "visualization", "render"]),
  scores: z.array(
    z.object({
      criterion: z.string(),
      score: z.number().int().min(4).max(5),
    }),
  ),
  repairs: z.array(z.string()),
});

/**
 * The Responses API only accepts a supported subset of JSON Schema. Dynamic
 * record keys are represented as explicit entries at the model boundary and
 * converted back into the app's EpisodeSpec after parsing.
 */
export const ModelEpisodeSpecSchema = EpisodeDraftSchema.extend({
  visualizations: z.array(ModelTeachingVisualizationSpecSchema).min(2),
  qualityGates: z.array(ModelGateSchema).length(4),
});

export type ModelEpisodeSpec = z.infer<typeof ModelEpisodeSpecSchema>;

function removeNullishValues(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(removeNullishValues);
  if (typeof value !== "object" || value === null) return value;

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry !== null && entry !== undefined)
      .map(([key, entry]) => [key, removeNullishValues(entry)]),
  );
}

export function modelEpisodeToEpisodeSpec(modelEpisode: ModelEpisodeSpec): EpisodeSpec {
  const convertedDraft = {
    ...modelEpisode,
    visualizations: modelEpisode.visualizations.map((visualization) => ({
      ...visualization,
      visualEncoding: {
        ...visualization.visualEncoding,
        colorMeaning: Object.fromEntries(
          visualization.visualEncoding.colorMeaning.map(({ key, meaning }) => [
            key,
            meaning,
          ]),
        ),
        motionMeaning: visualization.visualEncoding.motionMeaning
          ? Object.fromEntries(
              visualization.visualEncoding.motionMeaning.map(({ key, meaning }) => [
                key,
                meaning,
              ]),
            )
          : undefined,
      },
    })),
    qualityGates: modelEpisode.qualityGates.map((gate) => ({
      ...gate,
      scores: Object.fromEntries(
        gate.scores.map(({ criterion, score }) => [criterion, score]),
      ),
    })),
  };

  const episodeDraft = EpisodeDraftSchema.parse(
    removeNullishValues(convertedDraft),
  );

  return EpisodeSpecSchema.parse({
    ...episodeDraft,
    shots: planEpisodeShots(episodeDraft),
  });
}
