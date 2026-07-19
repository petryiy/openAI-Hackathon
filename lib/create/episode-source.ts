export const MAX_SOURCE_LENGTH = 5000;
export const MIN_SOURCE_LENGTH = 12;

export const MOONBASE_SAMPLE =
  "A capsule is launched horizontally from the same height. If its horizontal speed doubles, how do its landing time and horizontal distance change?";

export const DETECTIVE_SAMPLE =
  "A medical test is 95% accurate, but only 1% of people have the condition. Why can a positive result still be more likely false than true?";

export const SUBJECTS = ["Calculus", "Physics", "Probability"] as const;
export const LEVELS = ["Middle school", "Secondary school", "Early university"] as const;

export type EpisodeSubject = (typeof SUBJECTS)[number];
export type EpisodeLevel = (typeof LEVELS)[number];
export type EpisodeGenre = "sci_fi" | "detective";
export type SignalState = "awaiting" | "incomplete" | "ready";

export type EpisodeSourceInput = {
  sourceInput: string;
  subject: EpisodeSubject;
  level: EpisodeLevel;
  genre: EpisodeGenre;
};

export function getSignalState(sourceInput: string): SignalState {
  const length = sourceInput.trim().length;
  if (length === 0) return "awaiting";
  return length < MIN_SOURCE_LENGTH ? "incomplete" : "ready";
}

export function isPdfReference(file: { name: string; type: string }) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

export function createEpisodePayload(input: EpisodeSourceInput) {
  return {
    ...input,
    language: "en" as const,
  };
}
