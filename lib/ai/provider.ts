import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { EpisodeSpecSchema, type EpisodeSpec, validateEpisodeSemantics } from "@/lib/episode/schema";
import { createEpisodePrompt, EPISODE_SYSTEM_PROMPT } from "@/lib/ai/prompt";

export class ModelConfigurationError extends Error {
  code = "OPENAI_API_KEY_REQUIRED" as const;
}

export async function generateEpisodeSpec(input: {
  sourceInput: string;
  subject: string;
  level: string;
  genre: "sci_fi" | "detective";
  language: "en" | "zh";
}): Promise<EpisodeSpec> {
  if (!process.env.OPENAI_API_KEY) {
    throw new ModelConfigurationError(
      "Add OPENAI_API_KEY to .env.local to generate a new episode. The seeded Moonbase episode remains available without it.",
    );
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.parse({
    model: process.env.OPENAI_MODEL ?? "gpt-5.6",
    reasoning: { effort: "medium" },
    input: [
      { role: "system", content: EPISODE_SYSTEM_PROMPT },
      { role: "user", content: createEpisodePrompt(input) },
    ],
    text: {
      format: zodTextFormat(EpisodeSpecSchema, "episode_spec"),
    },
  });

  if (!response.output_parsed) {
    throw new Error("The model did not return a complete episode specification.");
  }

  return validateEpisodeSemantics(EpisodeSpecSchema.parse(response.output_parsed));
}
