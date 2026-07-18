import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { createEpisodePrompt, EPISODE_SYSTEM_PROMPT } from "@/lib/ai/prompt";
import {
  ModelEpisodeSpecSchema,
  modelEpisodeToEpisodeSpec,
} from "@/lib/ai/schema";
import type { EpisodeSpec } from "@/lib/episode/schema";

export class ModelConfigurationError extends Error {
  code = "OPENAI_API_KEY_REQUIRED" as const;
}

type SafeModelError = {
  name: string;
  message: string;
  status?: number;
  code?: string;
  param?: string;
  requestId?: string;
};

export type PublicGenerationFailure = {
  code: string;
  message: string;
  recoverable: boolean;
};

const REASONING_EFFORTS = [
  "none",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
] as const;

type EpisodeReasoningEffort = (typeof REASONING_EFFORTS)[number];

export function resolveReasoningEffort(
  configured = process.env.OPENAI_REASONING_EFFORT,
): EpisodeReasoningEffort {
  return REASONING_EFFORTS.includes(configured as EpisodeReasoningEffort)
    ? (configured as EpisodeReasoningEffort)
    : "low";
}

function resolveRequestTimeout(configured = process.env.OPENAI_TIMEOUT_MS) {
  const parsed = Number(configured);
  return Number.isFinite(parsed) && parsed >= 30_000 && parsed <= 600_000
    ? parsed
    : 240_000;
}

function redactSecrets(value: string) {
  return value
    .replace(/sk-[a-zA-Z0-9_-]+/g, "[REDACTED_API_KEY]")
    .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]")
    .slice(0, 2000);
}

/**
 * Keeps provider failures diagnosable without serializing headers, request
 * bodies, API keys, or learner source text into logs or browser responses.
 */
export function getSafeModelError(error: unknown): SafeModelError {
  const candidate =
    typeof error === "object" && error !== null
      ? (error as Record<string, unknown>)
      : {};
  const message = error instanceof Error ? error.message : "Unknown model error.";
  const status = typeof candidate.status === "number" ? candidate.status : undefined;
  const code = typeof candidate.code === "string" ? candidate.code : undefined;
  const param = typeof candidate.param === "string" ? candidate.param : undefined;
  const requestId =
    typeof candidate.request_id === "string" ? candidate.request_id : undefined;

  return {
    name: error instanceof Error ? error.name : "UnknownError",
    message: redactSecrets(message),
    ...(status === undefined ? {} : { status }),
    ...(code === undefined ? {} : { code }),
    ...(param === undefined ? {} : { param }),
    ...(requestId === undefined ? {} : { requestId }),
  };
}

export function classifyGenerationError(
  error: unknown,
): PublicGenerationFailure {
  if (error instanceof ModelConfigurationError) {
    return { code: error.code, message: error.message, recoverable: true };
  }

  const diagnostic = getSafeModelError(error);
  if (diagnostic.code === "insufficient_quota") {
    return {
      code: "OPENAI_QUOTA_EXHAUSTED",
      message:
        "The OpenAI project has no available API quota. Add billing or raise its usage limit, then retry.",
      recoverable: true,
    };
  }
  if (diagnostic.status === 429) {
    return {
      code: "OPENAI_RATE_LIMITED",
      message:
        "OpenAI is temporarily rate limiting generation. Wait a moment, then retry.",
      recoverable: true,
    };
  }
  if (diagnostic.status === 401 || diagnostic.code === "invalid_api_key") {
    return {
      code: "OPENAI_AUTH_FAILED",
      message:
        "The configured OpenAI API key was rejected. Check the server-side key and restart the app.",
      recoverable: true,
    };
  }
  if (
    diagnostic.status === 403 ||
    diagnostic.code === "model_not_found" ||
    diagnostic.message.includes("does not have access to model")
  ) {
    return {
      code: "OPENAI_MODEL_ACCESS_DENIED",
      message:
        "This OpenAI project cannot access the selected model. Check the project, model, and key permissions.",
      recoverable: true,
    };
  }
  if (
    diagnostic.code === "invalid_json_schema" ||
    diagnostic.param === "text.format.schema"
  ) {
    return {
      code: "OPENAI_SCHEMA_REJECTED",
      message:
        "The episode output contract was rejected before generation. The offline demo remains available while the integration is repaired.",
      recoverable: false,
    };
  }
  if (
    diagnostic.name === "ZodError" ||
    /episode needs|scene .* has no approved shot|choice .* invalid|branches for/i.test(
      diagnostic.message,
    )
  ) {
    return {
      code: "EPISODE_VALIDATION_FAILED",
      message:
        "The source was accepted, but the generated draft failed an internal continuity check. Retry once, or use the offline episode while the draft is inspected.",
      recoverable: true,
    };
  }

  return {
    code: "GENERATION_FAILED",
    message:
      "Generation stopped before publication. Retry, or use the offline Moonbase episode while the service recovers.",
    recoverable: true,
  };
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

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    timeout: resolveRequestTimeout(),
    maxRetries: 0,
  });
  const response = await client.responses.parse({
    model: process.env.OPENAI_MODEL ?? "gpt-5.6",
    reasoning: { mode: "standard", effort: resolveReasoningEffort() },
    input: [
      { role: "system", content: EPISODE_SYSTEM_PROMPT },
      { role: "user", content: createEpisodePrompt(input) },
    ],
    text: {
      verbosity: "low",
      format: zodTextFormat(ModelEpisodeSpecSchema, "episode_spec"),
    },
  });

  if (!response.output_parsed) {
    throw new Error("The model did not return a complete episode specification.");
  }

  return modelEpisodeToEpisodeSpec(response.output_parsed);
}
