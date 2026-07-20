"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { makeDirectorDecision, evaluateTransfer } from "@/lib/adaptation/engine";
import type { Confidence, EpisodeSpec, LearnerState, StoryState, TeachingStrategy } from "@/lib/episode/schema";
import { getBeatDurationMs, getSpokenText, isInteractiveTarget, type PlaybackStatus } from "@/lib/player/playback";
import { CockpitStage } from "@/components/player/cockpit-stage";
import { ChoicePanel } from "@/components/player/choice-panel";
import { LearningRecap, type TransferResult } from "@/components/player/learning-recap";

export function EpisodePlayer({ episode, initialStates }: {
  episode: EpisodeSpec;
  initialStates: { storyState: StoryState; learnerState: LearnerState };
}) {
  const [storyState, setStoryState] = useState(initialStates.storyState);
  const [learnerState, setLearnerState] = useState(initialStates.learnerState);
  const [dialogueIndex, setDialogueIndex] = useState(0);
  const [status, setStatus] = useState<PlaybackStatus>("playing");
  const [voiceOn, setVoiceOn] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(true);
  const [directorNote, setDirectorNote] = useState<{ strategy: TeachingStrategy; text: string } | null>(null);
  const [transferResult, setTransferResult] = useState<TransferResult | null>(null);
  const [transferOption, setTransferOption] = useState("");
  const [busy, setBusy] = useState(false);
  const advanceLockRef = useRef(false);

  const scene = episode.scenes.find((item) => item.id === storyState.currentSceneId) ?? episode.scenes[0];
  const choiceNode = episode.choiceNodes.find((item) => item.id === scene.choiceNodeId);
  const currentDialogue = scene.dialogue[dialogueIndex];
  const currentSpeaker = episode.storyBible.characters.find((character) => character.id === currentDialogue?.characterId);
  const spokenText = getSpokenText(scene, dialogueIndex);
  const pathStep = getPathStep(episode, scene, storyState, Boolean(transferResult));
  const currentSceneNumber = Math.max(1, episode.scenes.findIndex((item) => item.id === scene.id) + 1);

  const moveToScene = useCallback((nextSceneId: string) => {
    const next = episode.scenes.find((item) => item.id === nextSceneId);
    setStoryState((current) => ({
      ...current,
      currentSceneId: nextSceneId,
      completedSceneIds: Array.from(new Set([...current.completedSceneIds, current.currentSceneId])),
    }));
    setDialogueIndex(0);
    setDirectorNote(null);
    setStatus(next?.kind === "transfer" ? "transfer" : "playing");
  }, [episode.scenes]);

  const advanceBeat = useCallback(() => {
    if (advanceLockRef.current || status !== "playing") return;
    advanceLockRef.current = true;
    window.setTimeout(() => { advanceLockRef.current = false; }, 120);
    if (dialogueIndex < scene.dialogue.length - 1) {
      setDialogueIndex((value) => value + 1);
      return;
    }
    if (choiceNode) {
      setStatus("decision");
      return;
    }
    const nextSceneId = scene.nextSceneIds[0];
    if (nextSceneId) moveToScene(nextSceneId);
  }, [choiceNode, dialogueIndex, moveToScene, scene, status]);

  useEffect(() => {
    if (status !== "playing") return;
    const duration = getBeatDurationMs(episode, scene, dialogueIndex);
    const finalBeat = dialogueIndex >= scene.dialogue.length - 1;
    let advanceTimer = 0;
    let safetyTimer = 0;

    if (voiceOn && spokenText && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(spokenText);
      const speakerIndex = episode.storyBible.characters.findIndex((character) => character.id === currentDialogue?.characterId);
      utterance.rate = currentSpeaker?.voiceStyle.match(/quick|rapid/i) ? 1.08 : 0.96;
      utterance.pitch = speakerIndex < 0 ? 1 : 0.92 + speakerIndex * 0.14;
      utterance.onend = () => {
        window.clearTimeout(safetyTimer);
        advanceTimer = window.setTimeout(advanceBeat, finalBeat ? 500 : 0);
      };
      window.speechSynthesis.speak(utterance);
      safetyTimer = window.setTimeout(advanceBeat, duration + 2_000);
    } else {
      advanceTimer = window.setTimeout(advanceBeat, duration + (finalBeat ? 500 : 0));
    }
    return () => {
      window.clearTimeout(advanceTimer);
      window.clearTimeout(safetyTimer);
      if (voiceOn && "speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, [advanceBeat, currentDialogue?.characterId, currentSpeaker?.voiceStyle, dialogueIndex, episode, scene, spokenText, status, voiceOn]);

  useEffect(() => {
    function onVisibilityChange() {
      if (document.hidden) setStatus((current) => current === "playing" ? "paused" : current);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (isInteractiveTarget(event.target)) return;
      if (event.code === "Space" && (status === "playing" || status === "paused")) {
        event.preventDefault();
        setStatus((current) => current === "playing" ? "paused" : "playing");
      }
      if (event.code === "ArrowRight" && status === "playing") {
        event.preventDefault();
        advanceBeat();
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [advanceBeat, status]);

  useEffect(() => {
    window.localStorage.setItem(`plot-as-proof:${episode.id}:latest`, JSON.stringify({ storyState, learnerState }));
  }, [episode.id, learnerState, storyState]);

  async function commitChoice(optionId: string, confidence: Confidence) {
    if (!choiceNode || busy) return;
    setBusy(true);
    setStatus("directing");
    const submission = { choiceNodeId: choiceNode.id, optionId, confidence, storyState, learnerState };
    let result: ReturnType<typeof makeDirectorDecision>;
    try {
      const response = await fetch(`/api/episodes/${episode.id}/choices`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(submission),
      });
      if (!response.ok) throw new Error("Branch service unavailable");
      result = await response.json();
    } catch {
      result = makeDirectorDecision(episode, submission);
    }
    setStoryState(result.storyState);
    setLearnerState(result.learnerState);
    setDialogueIndex(0);
    setDirectorNote({ strategy: result.decision.strategy, text: result.decision.shortRationale });
    window.setTimeout(() => {
      const next = episode.scenes.find((item) => item.id === result.storyState.currentSceneId);
      setStatus(next?.kind === "transfer" ? "transfer" : "playing");
      setBusy(false);
    }, 900);
  }

  async function submitTransfer() {
    if (!transferOption || busy) return;
    setBusy(true);
    let result: TransferResult;
    try {
      const response = await fetch(`/api/episodes/${episode.id}/transfer`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ optionId: transferOption, storyState, learnerState }),
      });
      if (!response.ok) throw new Error("Transfer service unavailable");
      result = await response.json();
    } catch {
      result = evaluateTransfer(episode, transferOption, learnerState);
    }
    setLearnerState(result.learnerState);
    setTransferResult(result);
    setStatus("complete");
    setBusy(false);
  }

  function replay() {
    setStoryState(initialStates.storyState); setLearnerState(initialStates.learnerState);
    setDialogueIndex(0); setStatus("playing"); setDirectorNote(null);
    setTransferOption(""); setTransferResult(null); setBusy(false);
  }

  const scenePurpose = useMemo(() => scene.educationalPurpose, [scene.educationalPurpose]);
  if (transferResult) return <LearningRecap episode={episode} storyState={storyState} result={transferResult} onReplay={replay} />;

  return (
    <main className="episode-cinema" data-status={status}>
      <header className="cinema-hud">
        <Link href="/" className="cinema-brand">PLOT AS PROOF</Link>
        <div className="cinema-episode"><span>{episode.subject} · EPISODE 01</span><strong>{episode.title}</strong></div>
        <div className="cinema-controls">
          <button type="button" aria-pressed={captionsOn} onClick={() => setCaptionsOn((value) => !value)}>CC</button>
          <button type="button" aria-pressed={voiceOn} onClick={() => setVoiceOn((value) => !value)} aria-label="Toggle synthesized voices">{voiceOn ? "SOUND ON" : "MUTED"}</button>
          <Link href="/" aria-label="Close episode">CLOSE</Link>
        </div>
      </header>

      <section className="cinema-stage-wrap">
        <CockpitStage episode={episode} scene={scene} dialogueIndex={dialogueIndex} strategy={learnerState.lastTeachingStrategy} captionsOn={captionsOn} />
        {status === "decision" && choiceNode ? <ChoicePanel key={choiceNode.id} node={choiceNode} checkpoint={episode.choiceNodes.findIndex((item) => item.id === choiceNode.id) + 1} onCommit={commitChoice} busy={busy} /> : null}
        {status === "directing" ? <div className="director-recalibration" role="status"><span /><strong>DIRECTOR RECALIBRATING</strong><p>{directorNote?.text ?? "Reading the decision and selecting the next representation."}</p></div> : null}
        {status === "transfer" ? (
          <div className="transfer-interruption" role="dialog" aria-modal="true" aria-labelledby="transfer-heading">
            <p>UNASSISTED TRANSFER · FINAL CHECK</p>
            <h2 id="transfer-heading">{episode.transferTask.prompt}</h2>
            <small>New surface. Same relationship. No hints.</small>
            <div>{episode.transferTask.options.map((option, index) => <button key={option.id} type="button" className={transferOption === option.id ? "is-selected" : ""} aria-pressed={transferOption === option.id} onClick={() => setTransferOption(option.id)}><span>{String.fromCharCode(65 + index)}</span>{option.label}</button>)}</div>
            <button className="transfer-lock" type="button" disabled={!transferOption || busy} onClick={submitTransfer}>{busy ? "EVALUATING…" : "LOCK ANSWER"}</button>
          </div>
        ) : null}
        {status === "paused" ? <button className="cinema-paused" type="button" onClick={() => setStatus("playing")}><span>▶</span><strong>RESUME EPISODE</strong><small>Space to continue</small></button> : null}
      </section>

      <footer className="cinema-timeline">
        <div><span style={{ width: `${pathStep}%` }} /></div>
        <p><strong>{String(currentSceneNumber).padStart(2, "0")}</strong><span>{scene.title}</span><small>{scenePurpose}</small></p>
        <button type="button" disabled={status !== "playing"} onClick={advanceBeat}>SKIP BEAT <span>→</span></button>
      </footer>
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
