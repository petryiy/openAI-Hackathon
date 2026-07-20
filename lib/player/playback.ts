import type { EpisodeSpec, SceneSpec } from "@/lib/episode/schema";

export type PlaybackStatus = "playing" | "paused" | "decision" | "directing" | "transfer" | "complete";

export function getSpokenText(scene: SceneSpec, dialogueIndex: number) {
  return scene.dialogue[dialogueIndex]?.text ?? scene.narration ?? "";
}

export function getBeatDurationMs(episode: EpisodeSpec, scene: SceneSpec, dialogueIndex: number) {
  const shots = episode.shots.filter((shot) => shot.sceneId === scene.id);
  const shotDuration = shots.reduce((total, shot) => total + shot.durationMs, 0);
  const beatCount = Math.max(1, scene.dialogue.length || (scene.narration ? 1 : 0));
  const allocated = shotDuration > 0 ? shotDuration / beatCount : 0;
  const readingTime = 900 + getSpokenText(scene, dialogueIndex).length * 45;
  return Math.min(8_000, Math.max(2_800, allocated, readingTime));
}

export function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest("button, a, input, textarea, select, [contenteditable='true'], [role='dialog']"));
}
