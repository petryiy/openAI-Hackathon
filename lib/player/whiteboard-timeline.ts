import type { WhiteboardAction, WhiteboardScene } from "@/lib/lesson/whiteboard-dsl";
import { resolveAnchorTimeMs, type NarrationAlignment } from "@/lib/media/alignment";

export type WhiteboardCue = {
  action: WhiteboardAction;
  index: number;
  startMs: number;
  durationMs: number;
};

/**
 * Compile a scene's actions into absolutely-timed cues. Cue starts are
 * non-decreasing (a later action never fires before an earlier one) and every
 * cue finishes inside the segment.
 */
export function compileTimeline(
  scene: WhiteboardScene,
  narration: string,
  alignment: NarrationAlignment | null,
  segmentDurationMs: number,
): WhiteboardCue[] {
  let cursor = 0;
  return scene.actions.map((action, index) => {
    const anchored = action.anchor.kind === "ratio"
      ? Math.round(action.anchor.value * segmentDurationMs)
      : resolveAnchorTimeMs(narration, action.anchor.text, alignment, segmentDurationMs);
    const startMs = Math.min(Math.max(anchored, cursor), Math.max(0, segmentDurationMs - 200));
    cursor = startMs;
    const durationMs = Math.max(200, Math.min(action.durationMs, segmentDurationMs - startMs));
    return { action, index, startMs, durationMs };
  });
}

/**
 * Elements whose first cue is an entrance (appear/write/draw) start hidden;
 * everything else is visible from the first frame.
 */
export function initiallyHiddenElementIds(scene: WhiteboardScene): Set<string> {
  const hidden = new Set<string>();
  const touched = new Set<string>();
  for (const action of scene.actions) {
    if (touched.has(action.targetId)) continue;
    touched.add(action.targetId);
    if (action.op === "appear" || action.op === "write" || action.op === "draw") hidden.add(action.targetId);
  }
  // A morph target enters by crossfade, so it must start hidden too.
  for (const action of scene.actions) {
    if (action.op === "morph" && action.toTargetId && !touched.has(action.toTargetId)) hidden.add(action.toTargetId);
  }
  return hidden;
}
