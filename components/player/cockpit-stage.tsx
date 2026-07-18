import type { EpisodeSpec, SceneSpec, TeachingStrategy } from "@/lib/episode/schema";
import { ProjectileVisual, TransferVisual } from "@/components/player/projectile-visual";

export function CockpitStage({
  episode,
  scene,
  dialogueIndex,
  strategy,
}: {
  episode: EpisodeSpec;
  scene: SceneSpec;
  dialogueIndex: number;
  strategy?: TeachingStrategy;
}) {
  const dialogue = scene.dialogue[dialogueIndex];
  const speaker = episode.storyBible.characters.find((character) => character.id === dialogue?.characterId);
  const isFocus = scene.visualMode !== "cockpit";

  return (
    <div className={`cinematic-stage mode-${scene.visualMode} ${isFocus ? "is-focus" : ""}`}>
      <div className="stage-grain" aria-hidden="true" />
      <div className="stage-hud-top">
        <span>ROVER 07 · LUNAR SOUTH</span>
        <span className="mission-timer"><i /> 02:{scene.id === "cold-open" ? "30" : scene.id.includes("gravity") ? "41" : "07"}</span>
      </div>

      <div className="cockpit-window" aria-hidden="true">
        <div className="moon-horizon"><span className="crater crater-1" /><span className="crater crater-2" /></div>
        <div className="dust-front" />
        <div className="window-strut strut-left" /><div className="window-strut strut-right" />
      </div>

      <div className="cockpit-console" aria-hidden="true">
        <div className="console-dial"><span>Vₓ</span><strong>{scene.id === "cold-open" || scene.id === "first-decision" ? "2.0×" : "LOCK"}</strong></div>
        <div className="console-line" />
        <div className="gravity-readout"><span>GRAVITY</span><strong>{scene.visualMode === "gravity" ? "0.50 g" : "1.00 g"}</strong></div>
      </div>

      {!isFocus ? (
        <div className="character-stage" aria-hidden="true">
          {scene.characterIds.includes("aya") ? <CharacterFigure kind="aya" /> : null}
          {scene.characterIds.includes("bolt") ? <CharacterFigure kind="bolt" /> : null}
        </div>
      ) : null}

      {scene.visualMode === "trajectory" || scene.visualMode === "split_experiment" || scene.visualMode === "gravity" ? (
        <div className="visual-focus"><ProjectileVisual mode={scene.visualMode} /></div>
      ) : null}
      {scene.visualMode === "transfer" ? <div className="visual-focus transfer-focus"><TransferVisual /></div> : null}

      <div className="stage-scene-label">
        <span>{scene.kind === "branch" ? `${strategy ?? "adaptive"} branch` : scene.kind}</span>
        <strong>{scene.title}</strong>
      </div>

      {dialogue ? (
        <div className="subtitle-card" role="status" aria-live="polite">
          <div className={`speaker-token speaker-${dialogue.characterId}`}>{speaker?.name.slice(0, 1) ?? "•"}</div>
          <div><span>{speaker?.name ?? "Narrator"}</span><p>{dialogue.text}</p></div>
        </div>
      ) : scene.narration ? (
        <div className="subtitle-card subtitle-card--narration" role="status" aria-live="polite">
          <div><span>Narrator</span><p>{scene.narration}</p></div>
        </div>
      ) : null}
    </div>
  );
}

function CharacterFigure({ kind }: { kind: "aya" | "bolt" }) {
  if (kind === "bolt") {
    return <div className="character character--bolt"><div className="bolt-antenna" /><div className="bolt-head"><span className="bolt-eye left" /><span className="bolt-eye right" /><i /></div><div className="bolt-body"><span>B7</span></div></div>;
  }
  return <div className="character character--aya"><div className="aya-head"><span className="aya-hair" /><i className="aya-eye left" /><i className="aya-eye right" /></div><div className="aya-suit"><span>CHEN</span><i /></div></div>;
}
