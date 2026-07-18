import type { EpisodeSpec, SceneSpec, TeachingStrategy } from "@/lib/episode/schema";
import { ConceptVisual } from "@/components/player/concept-visual";
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
  if (episode.id !== "moonbase-last-shot") {
    return <GeneratedDramaStage episode={episode} scene={scene} dialogueIndex={dialogueIndex} strategy={strategy} />;
  }

  return <MoonbaseStage episode={episode} scene={scene} dialogueIndex={dialogueIndex} strategy={strategy} />;
}

function MoonbaseStage({
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
        <Subtitle speaker={speaker?.name} speakerId={dialogue.characterId} text={dialogue.text} />
      ) : scene.narration ? <Subtitle text={scene.narration} /> : null}
    </div>
  );
}

function GeneratedDramaStage({
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
  const visual = scene.visualizationIds
    .map((visualId) => episode.visualizations.find((item) => item.id === visualId))
    .find(Boolean);
  const activeCharacters = scene.characterIds.length
    ? episode.storyBible.characters.filter((character) => scene.characterIds.includes(character.id))
    : episode.storyBible.characters;

  return (
    <div className={`cinematic-stage generated-drama-stage ${visual ? "is-focus" : "is-story"}`}>
      <div className="stage-grain" aria-hidden="true" />
      <div className="stage-hud-top">
        <span className="generated-location">{episode.storyBible.singleLocation}</span>
        <span className="mission-timer"><i />{episode.storyBible.tickingClock}</span>
      </div>

      {!visual ? (
        <div className="generated-set" aria-hidden="true">
          <div className="generated-set__light" />
          <div className="generated-set__board">
            <small>LIVE CASE BOARD</small>
            <strong>{episode.storyBible.stakes}</strong>
            <div>{episode.storyBible.observableProps.slice(0, 3).map((prop, index) => <span key={prop}><i>{index + 1}</i>{prop}</span>)}</div>
          </div>
          <div className="generated-set__table"><span /><span /><span /></div>
          <div className="generated-cast">
            {activeCharacters.map((character, index) => (
              <div className={`generated-character generated-character--${index + 1} ${character.id === dialogue?.characterId ? "is-speaking" : ""}`} key={character.id}>
                <div className="generated-character__head"><i /></div>
                <div className="generated-character__body"><span>{character.name.slice(0, 1)}</span></div>
                <small>{character.name}</small>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="visual-focus generated-visual-focus"><ConceptVisual visual={visual} /></div>
      )}

      <div className="stage-scene-label">
        <span>{scene.kind === "branch" ? `${strategy ?? "adaptive"} branch` : scene.kind}</span>
        <strong>{scene.title}</strong>
      </div>

      {dialogue ? (
        <Subtitle speaker={speaker?.name} speakerId={dialogue.characterId} text={dialogue.text} />
      ) : scene.narration ? <Subtitle text={scene.narration} /> : null}
    </div>
  );
}

function Subtitle({ speaker, speakerId, text }: { speaker?: string; speakerId?: string; text: string }) {
  if (!speakerId) {
    return <div className="subtitle-card subtitle-card--narration" role="status" aria-live="polite"><div><span>Narrator</span><p>{text}</p></div></div>;
  }
  return (
    <div className="subtitle-card" role="status" aria-live="polite">
      <div className={`speaker-token speaker-${speakerId}`}>{speaker?.slice(0, 1) ?? "•"}</div>
      <div><span>{speaker ?? "Narrator"}</span><p>{text}</p></div>
    </div>
  );
}

function CharacterFigure({ kind }: { kind: "aya" | "bolt" }) {
  if (kind === "bolt") {
    return <div className="character character--bolt"><div className="bolt-antenna" /><div className="bolt-head"><span className="bolt-eye left" /><span className="bolt-eye right" /><i /></div><div className="bolt-body"><span>B7</span></div></div>;
  }
  return <div className="character character--aya"><div className="aya-head"><span className="aya-hair" /><i className="aya-eye left" /><i className="aya-eye right" /></div><div className="aya-suit"><span>CHEN</span><i /></div></div>;
}
