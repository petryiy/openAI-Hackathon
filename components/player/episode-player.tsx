"use client";

import Link from "next/link";
import { type CSSProperties, useEffect, useMemo, useState, useTransition } from "react";
import { makeDirectorDecision, evaluateTransfer } from "@/lib/adaptation/engine";
import type { Confidence, EpisodeSpec, LearnerState, StoryState, TeachingStrategy } from "@/lib/episode/schema";
import { CockpitStage } from "@/components/player/cockpit-stage";
import { ChoicePanel } from "@/components/player/choice-panel";
import { LearningRecap, type TransferResult } from "@/components/player/learning-recap";

export function EpisodePlayer({
  episode,
  initialStates,
}: {
  episode: EpisodeSpec;
  initialStates: { storyState: StoryState; learnerState: LearnerState };
}) {
  const [storyState, setStoryState] = useState(initialStates.storyState);
  const [learnerState, setLearnerState] = useState(initialStates.learnerState);
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [choiceOpen, setChoiceOpen] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(true);
  const [directorNote, setDirectorNote] = useState<{ strategy: TeachingStrategy; text: string } | null>(null);
  const [transferResult, setTransferResult] = useState<TransferResult | null>(null);
  const [transferOption, setTransferOption] = useState("");
  const [busy, startTransition] = useTransition();

  const scene = episode.scenes.find((item) => item.id === storyState.currentSceneId) ?? episode.scenes[0];
  const choiceNode = episode.choiceNodes.find((item) => item.id === scene.choiceNodeId);
  const currentDialogue = scene.dialogue[dialogueIndex];
  const currentSpeaker = episode.storyBible.characters.find((character) => character.id === currentDialogue?.characterId);
  const spokenText = currentDialogue?.text ?? scene.narration ?? "";
  const pathStep = getPathStep(episode, scene, storyState, Boolean(transferResult));
  const transferSceneId = episode.scenes.find((item) => item.kind === "transfer")?.id;

  useEffect(() => {
    if (!voiceOn || !spokenText || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(spokenText);
    const speakerIndex = episode.storyBible.characters.findIndex((character) => character.id === currentDialogue?.characterId);
    utterance.rate = currentSpeaker?.voiceStyle.match(/快|quick|rapid/i) ? 1.08 : 0.96;
    utterance.pitch = speakerIndex < 0 ? 1 : 0.92 + speakerIndex * 0.14;
    window.speechSynthesis.speak(utterance);
    return () => window.speechSynthesis.cancel();
  }, [currentDialogue?.characterId, currentSpeaker?.voiceStyle, episode.storyBible.characters, spokenText, voiceOn]);

  useEffect(() => {
    window.localStorage.setItem(
      `plot-as-proof:${episode.id}:latest`,
      JSON.stringify({ storyState, learnerState }),
    );
  }, [episode.id, learnerState, storyState]);

  const currentStrategy = learnerState.lastTeachingStrategy;
  const beatButtonLabel = useMemo(() => {
    if (dialogueIndex < scene.dialogue.length - 1) return "Next line";
    if (choiceNode) return "Make the call";
    if (scene.nextSceneIds[0] === transferSceneId) return "Take the transfer check";
    if (scene.kind === "branch" || scene.kind === "explanation") return "Follow the evidence";
    return "Continue";
  }, [choiceNode, dialogueIndex, scene, transferSceneId]);

  function advanceBeat() {
    if (dialogueIndex < scene.dialogue.length - 1) {
      setDialogueIndex((value) => value + 1);
      return;
    }
    if (choiceNode) {
      setChoiceOpen(true);
      return;
    }
    const nextSceneId = scene.nextSceneIds[0];
    if (nextSceneId) moveToScene(nextSceneId);
  }

  function moveToScene(nextSceneId: string) {
    setStoryState((current) => ({
      ...current,
      currentSceneId: nextSceneId,
      completedSceneIds: Array.from(new Set([...current.completedSceneIds, current.currentSceneId])),
    }));
    setDialogueIndex(0);
    setChoiceOpen(false);
    setDirectorNote(null);
  }

  function commitChoice(optionId: string, confidence: Confidence) {
    if (!choiceNode) return;
    startTransition(async () => {
      const submission = {
        choiceNodeId: choiceNode.id,
        optionId,
        confidence,
        storyState,
        learnerState,
      };
      let result: ReturnType<typeof makeDirectorDecision>;
      try {
        const response = await fetch(`/api/episodes/${episode.id}/choices`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(submission),
        });
        if (!response.ok) throw new Error("Branch service unavailable");
        result = await response.json();
      } catch {
        result = makeDirectorDecision(episode, submission);
      }
      setStoryState(result.storyState);
      setLearnerState(result.learnerState);
      setDialogueIndex(0);
      setChoiceOpen(false);
      setDirectorNote({ strategy: result.decision.strategy, text: result.decision.shortRationale });
    });
  }

  function submitTransfer() {
    if (!transferOption) return;
    startTransition(async () => {
      let result: TransferResult;
      try {
        const response = await fetch(`/api/episodes/${episode.id}/transfer`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ optionId: transferOption, storyState, learnerState }),
        });
        if (!response.ok) throw new Error("Transfer service unavailable");
        result = await response.json();
      } catch {
        result = evaluateTransfer(episode, transferOption, learnerState);
      }
      setLearnerState(result.learnerState);
      setTransferResult(result);
    });
  }

  function replay() {
    setStoryState(initialStates.storyState);
    setLearnerState(initialStates.learnerState);
    setDialogueIndex(0);
    setChoiceOpen(false);
    setDirectorNote(null);
    setTransferOption("");
    setTransferResult(null);
  }

  if (transferResult) {
    return <LearningRecap episode={episode} storyState={storyState} result={transferResult} onReplay={replay} />;
  }

  return (
    <main className="player-shell">
      <header className="player-header">
        <Link href="/" className="brand"><span className="brand-mark">P<span>↗</span></span><span><strong>Plot as Proof</strong><small>Interactive episode</small></span></Link>
        <div className="episode-title"><span>{episode.subject}</span><strong>{episode.title}</strong></div>
        <div className="player-tools">
          <button type="button" aria-pressed={captionsOn} onClick={() => setCaptionsOn((value) => !value)}>CC</button>
          <button type="button" aria-pressed={voiceOn} onClick={() => setVoiceOn((value) => !value)} aria-label="Toggle synthesized character voices">{voiceOn ? "◖))" : "◖×"}</button>
          <Link href="/" aria-label="Close episode">×</Link>
        </div>
      </header>

      <section className="player-layout">
        <div className="episode-rail">
          <span className="rail-label">Episode progress</span>
          <div className="vertical-progress"><span style={{ height: `${pathStep}%`, "--mobile-progress": `${pathStep}%` } as CSSProperties} /></div>
          <strong>{pathStep}%</strong>
          <div className="rail-chapters"><span className={pathStep >= 10 ? "active" : ""}>Crisis</span><span className={pathStep >= 42 ? "active" : ""}>Proof</span><span className={pathStep >= 72 ? "active" : ""}>Transfer</span></div>
        </div>

        <div className={`player-frame ${captionsOn ? "captions-on" : "captions-off"}`}>
          <CockpitStage episode={episode} scene={scene} dialogueIndex={dialogueIndex} strategy={currentStrategy} />
          {choiceOpen && choiceNode ? <ChoicePanel node={choiceNode} checkpoint={episode.choiceNodes.findIndex((item) => item.id === choiceNode.id) + 1} onCommit={commitChoice} busy={busy} /> : null}
          {scene.kind === "transfer" ? (
            <div className="choice-dock transfer-dock">
              <div className="choice-dock__heading"><span>Unassisted transfer</span><h2>{episode.transferTask.prompt}</h2><small>No hints. New surface, same relationship.</small></div>
              <div className="choice-options transfer-options">{episode.transferTask.options.map((option, index) => <button key={option.id} type="button" className={transferOption === option.id ? "is-selected" : ""} aria-pressed={transferOption === option.id} onClick={() => setTransferOption(option.id)}><span>{String.fromCharCode(65 + index)}</span>{option.label}</button>)}</div>
              <button className="primary-button transfer-submit" disabled={!transferOption || busy} onClick={submitTransfer}>{busy ? "Evaluating…" : "Finish episode →"}</button>
            </div>
          ) : null}
        </div>

        <aside className="scene-context">
          <span className="context-number">{String(pathStep < 42 ? 1 : pathStep < 72 ? 2 : 3).padStart(2, "0")}</span>
          <p className="eyebrow">Scene purpose</p>
          <h2>{scene.title}</h2>
          <p>{scene.educationalPurpose}</p>
          {directorNote ? <div className={`director-note strategy-${directorNote.strategy}`}><span>AI director · {directorNote.strategy}</span><p>{directorNote.text}</p></div> : null}
          {scene.visualizationIds.length ? <div className="visual-evidence"><span>Deterministic visual</span><strong>{getRendererLabel(episode, scene)}</strong><small>{scene.visualizationIds.join(" · ")}</small></div> : null}
          {scene.kind !== "transfer" && !choiceOpen ? <button className="primary-button scene-next" onClick={advanceBeat}>{beatButtonLabel} <span>→</span></button> : null}
          <small className="keyboard-hint">Captions are on by default. Voice uses your browser’s local speech engine.</small>
        </aside>
      </section>
    </main>
  );
}

export function getPathStep(episode: EpisodeSpec, scene: EpisodeSpec["scenes"][number], storyState: StoryState, complete: boolean) {
  if (complete) return 100;
  if (scene.kind === "transfer") return 94;

  const currentChoiceIndex = episode.choiceNodes.findIndex((node) => node.id === scene.choiceNodeId);
  if (currentChoiceIndex === 0) return 28;
  if (currentChoiceIndex === 1) return 63;

  const completedChoices = episode.choiceNodes.filter((node) => storyState.completedSceneIds.includes(node.sceneId)).length;
  if (completedChoices >= 2) return 82;
  if (completedChoices === 1) return 46;
  return episode.scenes[0]?.id === scene.id ? 12 : 18;
}

function getRendererLabel(episode: EpisodeSpec, scene: EpisodeSpec["scenes"][number]) {
  const renderers = scene.visualizationIds
    .map((visualId) => episode.visualizations.find((visual) => visual.id === visualId)?.renderer)
    .filter((renderer): renderer is EpisodeSpec["visualizations"][number]["renderer"] => Boolean(renderer));
  const unique = Array.from(new Set(renderers)).map((renderer) => renderer.toUpperCase());
  return `${unique.join(" + ") || "SVG"} · exact labels`;
}
