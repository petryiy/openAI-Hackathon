import { describe, expect, it } from "vitest";
import {
  classifyGenerationError,
  getSafeModelError,
  resolveReasoningEffort,
} from "@/lib/ai/provider";

function apiError(
  message: string,
  details: { status?: number; code?: string; param?: string } = {},
) {
  return Object.assign(new Error(message), details);
}

describe("OpenAI generation error handling", () => {
  it("distinguishes exhausted quota from transient rate limiting", () => {
    expect(
      classifyGenerationError(
        apiError("You exceeded your current quota", {
          status: 429,
          code: "insufficient_quota",
        }),
      ).code,
    ).toBe("OPENAI_QUOTA_EXHAUSTED");

    expect(
      classifyGenerationError(
        apiError("Too many requests", {
          status: 429,
          code: "rate_limit_exceeded",
        }),
      ).code,
    ).toBe("OPENAI_RATE_LIMITED");
  });

  it("reports schema integration failures separately from learner input failures", () => {
    const result = classifyGenerationError(
      apiError("Invalid schema for response_format", {
        status: 400,
        code: "invalid_json_schema",
        param: "text.format.schema",
      }),
    );

    expect(result.code).toBe("OPENAI_SCHEMA_REJECTED");
    expect(result.recoverable).toBe(false);
  });

  it("redacts an accidentally included key from safe diagnostics", () => {
    const diagnostic = getSafeModelError(
      apiError("Authorization failed for sk-proj-do-not-log-this", {
        status: 401,
      }),
    );

    expect(diagnostic.message).not.toContain("sk-proj-do-not-log-this");
    expect(diagnostic.message).toContain("[REDACTED_API_KEY]");
  });

  it("uses low reasoning by default while preserving intentional overrides", () => {
    expect(resolveReasoningEffort(undefined)).toBe("low");
    expect(resolveReasoningEffort("medium")).toBe("medium");
    expect(resolveReasoningEffort("not-a-real-effort")).toBe("low");
  });
});
