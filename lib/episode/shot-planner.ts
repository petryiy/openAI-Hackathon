import type {
  EpisodeDraft,
  SceneSpec,
  ShotSpec,
} from "@/lib/episode/schema";

type ShotTemplate = ShotSpec["template"];

function shotTemplateFor(
  episode: EpisodeDraft,
  scene: SceneSpec,
  sceneIndex: number,
): ShotTemplate {
  const isFinalScene = scene.nextSceneIds.length === 0;
  const visualizations = scene.visualizationIds
    .map((id) => episode.visualizations.find((visualization) => visualization.id === id))
    .filter((visualization) => visualization !== undefined);

  if (scene.choiceNodeId) return "route/tool selection";
  if (scene.kind === "transfer") return "freeze frame with annotation";
  if (isFinalScene) return "final callback payoff";
  if (visualizations.some((visualization) => visualization.renderer === "manim")) {
    return "Manim diagram insertion";
  }
  if (
    visualizations.some(
      (visualization) =>
        visualization.type === "side_by_side_comparison" ||
        visualization.placement === "split_screen",
    )
  ) {
    return "split-screen comparison";
  }
  if (scene.kind === "branch") return "environment-wide consequence";
  if (scene.visualizationIds.length > 0) return "freeze frame with annotation";
  if (sceneIndex === 0 && scene.characterIds.length >= 3) {
    return "three-character establishing shot";
  }
  if (scene.dialogue.length >= 2) return "two-character dialogue";
  if (scene.dialogue.length === 1) return "push-in reveal";
  return "reaction close-up";
}

function cameraMoveFor(template: ShotTemplate) {
  const cameraMoves: Partial<Record<ShotTemplate, string>> = {
    "three-character establishing shot": "slow lateral pan across the single set",
    "two-character dialogue": "steady over-the-shoulder alternation",
    "reaction close-up": "brief reaction push-in",
    "push-in reveal": "controlled push-in toward the active prop",
    "split-screen comparison": "locked camera while the comparison animates",
    "freeze frame with annotation": "hold framing, then focus the teaching overlay",
    "route/tool selection": "point-of-view move toward the decision controls",
    "Manim diagram insertion": "transition from the in-world display into focus mode",
    "environment-wide consequence": "widen to reveal the visible consequence",
    "final callback payoff": "slow pull-back to the resolved single location",
  };
  return cameraMoves[template] ?? "subtle cinematic push-in";
}

function durationFor(scene: SceneSpec) {
  const spokenCharacters =
    (scene.narration?.length ?? 0) +
    scene.dialogue.reduce((total, line) => total + line.text.length, 0);
  return Math.min(12_000, Math.max(5_000, 4_500 + spokenCharacters * 45));
}

/**
 * Shot composition is constrained product-shell behavior, so it is derived
 * deterministically from model-authored scenes instead of asking the model to
 * reproduce scene IDs in a second parallel list.
 */
export function planEpisodeShots(episode: EpisodeDraft): ShotSpec[] {
  return episode.scenes.map((scene, index) => {
    const template = shotTemplateFor(episode, scene, index);
    const finalScene = scene.nextSceneIds.length === 0;

    return {
      id: `${scene.id}-shot-1`,
      sceneId: scene.id,
      template,
      durationMs: durationFor(scene),
      narrativeFunction: scene.summary,
      educationalFunction: scene.educationalPurpose,
      characterIds: scene.characterIds,
      dialogue: scene.dialogue[0]?.text,
      visualAction: scene.visualDirection,
      cameraMove: cameraMoveFor(template),
      jokeSetup: index === 0 ? episode.storyBible.runningGag : undefined,
      jokePayoff: finalScene ? episode.storyBible.callbackPayoff : undefined,
    };
  });
}
