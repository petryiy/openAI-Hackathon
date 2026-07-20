export const DIRECTOR_STAGES = [
  "ANALYZING SOURCE",
  "VERIFYING THE RULE",
  "WRITING THE WORLD",
  "DESIGNING DECISIONS",
  "COMPOSING SCENES",
  "RENDERING EVIDENCE",
] as const;

export function getObservationDelay(elapsedMs: number) {
  if (elapsedMs < 15_000) return 750;
  if (elapsedMs < 60_000) return 1_500;
  return 3_000;
}

export function getGenerationStartDelay(createdAt: string, now = Date.now()) {
  return Math.max(0, 2_600 - Math.max(0, now - Date.parse(createdAt)));
}

export function isTransientGenerationError(code?: string) {
  return code === "OPENAI_RATE_LIMITED" || code === "OPENAI_QUOTA_EXHAUSTED";
}
