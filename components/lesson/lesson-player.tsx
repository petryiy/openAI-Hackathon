"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { LessonVisual } from "@/components/lesson/lesson-visual";
import type { DerivativeLessonSpec, LessonLearnerState, LessonStoryState, ManimTemplateId } from "@/lib/lesson/schema";

type Phase = "lesson" | "checkpoint" | "practice" | "remediation" | "transfer" | "recap";

const REMEDIATION_COPY: Partial<Record<ManimTemplateId, { narration: string; notice: string[] }>> = {
  derivative_secant_to_tangent: {
    narration: "Focus on two points. Hold the first fixed and move the second toward it. Every intermediate line is still a secant; watch which stable value its slope approaches.",
    notice: ["Points getting closer does not force the slope to zero", "The ratio of vertical to horizontal change is what matters"],
  },
  derivative_limit_definition: {
    narration: "h tending to zero describes a process; it does not mean substitute zero immediately. Simplify the quotient first, then read the value it approaches.",
    notice: ["Approaching zero is not the same as already being zero", "The tangent slope comes from the limit of the difference quotient"],
  },
  derivative_same_value_different_slope: {
    narration: "Two functions can have the same value while moving in different directions. Height tells where the function is; the derivative tells its local direction and rate of change.",
    notice: ["Equal function values do not guarantee equal derivatives", "Position and local rate of change are different information"],
  },
  derivative_algebra_expansion_repair: {
    narration: "Expand every term completely, including cross terms created by a square or cube. Missing one changes the entire difference quotient.",
    notice: ["Expand the parentheses term by term", "Check that every cross term is present"],
  },
  derivative_cancel_h_repair: {
    narration: "Factor the common h from the numerator, then cancel it with the denominator. Only after that is it safe to let h tend to zero.",
    notice: ["Factor before canceling", "Do not substitute h=0 too early"],
  },
  derivative_function_derivative_link: {
    narration: "Check the same relationship with another function. The function graph gives height; at the same x, the derivative graph gives tangent slope.",
    notice: ["Align both graphs at the same x", "Verify that the relationship still holds for another function"],
  },
  derivative_missing_inner_repair: { narration: "Keep the inner expression intact, differentiate the outer function, and multiply by the derivative of the inside.", notice: ["The inner derivative is a required factor", "Read composition from the outside inward"] },
  derivative_product_repair: { narration: "Differentiate one factor at a time while holding the other fixed. The two resulting products must be added.", notice: ["Use u′v + uv′", "Do not multiply only the two derivatives"] },
  derivative_quotient_repair: { narration: "Keep the numerator order u′v minus uv′, then divide the entire result by v squared.", notice: ["Order and sign matter", "The denominator is squared"] },
  derivative_standard_function_repair: { narration: "Return to the registered derivative of the outer function, then preserve any inner derivative factor.", notice: ["Use the exact standard-function rule", "Keep signs and inner factors"] },
};

export function LessonPlayer({ lesson, initialStoryState, initialLearnerState }: { lesson: DerivativeLessonSpec; initialStoryState: LessonStoryState; initialLearnerState: LessonLearnerState }) {
  const storageKey = `plot-as-proof:lesson:${lesson.id}`;
  const [storyState, setStoryState] = useState(initialStoryState);
  const [learnerState, setLearnerState] = useState(initialLearnerState);
  const [phase, setPhase] = useState<Phase>("lesson");
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [captions, setCaptions] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [checkpointOption, setCheckpointOption] = useState("");
  const [practiceStep, setPracticeStep] = useState(0);
  const [expression, setExpression] = useState("");
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [activeField, setActiveField] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [remediationTemplate, setRemediationTemplate] = useState<ManimTemplateId | null>(null);
  const [remediationAnswer, setRemediationAnswer] = useState("");
  const [remediationReady, setRemediationReady] = useState(false);
  const [transferExpression, setTransferExpression] = useState("");
  const [transferResult, setTransferResult] = useState<{ correct: boolean; normalizedAnswer: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const reducedMotion = useMemo(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const segment = lesson.segments[storyState.currentSegmentIndex];
  const segmentAsset = lesson.assets.segments.find((asset) => asset.segmentId === segment.id);
  const hasManimVideo = !reducedMotion && segmentAsset?.renderMode === "manim" && Boolean(segmentAsset.videoUrl);
  const rawStep = lesson.guidedPractice.steps[practiceStep];
  const step = rawStep ? {
    ...rawStep,
    placeholder: "placeholder" in rawStep ? rawStep.placeholder : "Enter an expression in x",
    fields: "fields" in rawStep ? rawStep.fields : [],
  } : undefined;

  /* Restoring a persisted learning session intentionally initializes several independent state slices after hydration. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return;
    try {
      const value = JSON.parse(saved) as { storyState: LessonStoryState; learnerState: LessonLearnerState; phase: Phase; practiceStep: number; transferResult?: { correct: boolean; normalizedAnswer: string } };
      setStoryState(value.storyState); setLearnerState(value.learnerState); setPhase(value.phase); setPracticeStep(value.practiceStep);
      if (value.transferResult) setTransferResult(value.transferResult);
      else if (value.phase === "recap" && value.learnerState.transferCorrect !== null) setTransferResult({ correct: value.learnerState.transferCorrect, normalizedAnswer: value.learnerState.transferNormalizedAnswer ?? "Recorded answer" });
    } catch { window.localStorage.removeItem(storageKey); }
  }, [storageKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => { window.localStorage.setItem(storageKey, JSON.stringify({ storyState, learnerState, phase, practiceStep, transferResult })); }, [learnerState, phase, practiceStep, storageKey, storyState, transferResult]);

  useEffect(() => {
    const audio = audioRef.current;
    const video = videoRef.current;
    if (audio) audio.playbackRate = speed;
    if (video) {
      const synchronizedRate = audio?.duration && Number.isFinite(audio.duration) && video.duration && Number.isFinite(video.duration)
        ? speed * (video.duration / audio.duration)
        : speed;
      video.playbackRate = synchronizedRate;
    }
    if (playing) {
      if (audio) void audio.play().catch(() => setPlaying(false));
      if (video) void video.play().catch(() => setPlaying(false));
    } else {
      audio?.pause(); video?.pause();
    }
  }, [playing, speed, storyState.currentSegmentIndex]);

  function finishSegment() {
    const checkpoint = lesson.checkpoints.find((item) => item.afterSegmentId === segment.id);
    setPlaying(false);
    setStoryState((current) => ({ ...current, completedSegmentIds: Array.from(new Set([...current.completedSegmentIds, segment.id])), taskStatus: "learning" }));
    if (checkpoint) { setCheckpointOption(""); setPhase("checkpoint"); return; }
    advanceSegment();
  }

  function advanceSegment() {
    if (storyState.currentSegmentIndex >= lesson.segments.length - 1) {
      setStoryState((current) => ({ ...current, taskStatus: "practice" })); setPhase("practice"); return;
    }
    setStoryState((current) => ({ ...current, currentSegmentIndex: current.currentSegmentIndex + 1 })); setPlaying(false); setPhase("lesson");
  }

  function commitCheckpoint() {
    const checkpoint = lesson.checkpoints.find((item) => item.afterSegmentId === segment.id);
    const option = checkpoint?.options.find((item) => item.id === checkpointOption);
    if (!checkpoint || !option) return;
    const correct = option.correctness === "correct";
    const representation = !correct ? "counterexample" as const : "equation" as const;
    setLearnerState((current) => ({
      ...current,
      checkpointEvidence: [...current.checkpointEvidence.filter((item) => item.checkpointId !== checkpoint.id), { checkpointId: checkpoint.id, optionId: option.id, correct }],
      possibleMisconceptions: option.misconceptionCode ? Array.from(new Set([...current.possibleMisconceptions, option.misconceptionCode as LessonLearnerState["possibleMisconceptions"][number]])) : current.possibleMisconceptions,
      representationsUsed: Array.from(new Set([...current.representationsUsed, representation])),
    }));
    if (!correct) {
      const template = lesson.schemaVersion === 2
        ? lesson.remediation[option.misconceptionCode ?? "WRONG_DERIVATIVE_RULE"] ?? "derivative_standard_function_repair"
        : checkpoint.id === "checkpoint-secant" ? "derivative_limit_definition" : "derivative_same_value_different_slope";
      setRemediationTemplate(template); setPhase("remediation"); return;
    }
    advanceSegment();
  }

  async function submitStep() {
    if (!step || busy) return;
    const symbolicReady = lesson.schemaVersion === 2 && "fields" in step && step.fields.every((field) => responses[field.id]?.trim());
    if (lesson.schemaVersion === 1 && !expression.trim()) return;
    if (lesson.schemaVersion === 2 && !symbolicReady) return;
    setBusy(true); setFeedback("");
    try {
      const payload = lesson.schemaVersion === 1 ? { stepId: step.id, expression, learnerState } : { stepId: step.id, responses, learnerState };
      const response = await fetch(`/api/lessons/${lesson.id}/attempts`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? "That expression could not be parsed.");
      setLearnerState(data.learnerState); setFeedback(data.feedback);
      if (data.correct) {
        window.setTimeout(() => { setExpression(""); setResponses({}); setFeedback(""); if (practiceStep === lesson.guidedPractice.steps.length - 1) { setStoryState((current) => ({ ...current, taskStatus: "transfer" })); setPhase("transfer"); } else setPracticeStep((value) => value + 1); }, 650);
      } else if (data.nextAction === "play_remediation") {
        setRemediationAnswer(""); setRemediationReady(false); setFeedback("");
        setRemediationTemplate(lesson.remediation[data.misconceptionCode]); setPhase("remediation");
      }
    } catch (error) { setFeedback((error as Error).message); }
    finally { setBusy(false); }
  }

  async function submitTransfer() {
    if (!transferExpression.trim() || busy) return;
    setBusy(true); setFeedback("");
    try {
      const response = await fetch(`/api/lessons/${lesson.id}/transfer`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ expression: transferExpression, learnerState }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error?.message ?? "That answer could not be parsed.");
      setLearnerState(data.learnerState); setTransferResult(data); setStoryState((current) => ({ ...current, taskStatus: "complete" })); setPhase("recap");
    } catch (error) { setFeedback((error as Error).message); }
    finally { setBusy(false); }
  }

  async function submitRemediationCheck() {
    if (lesson.schemaVersion !== 2 || !remediationAnswer.trim() || busy) return;
    setBusy(true); setFeedback("");
    try {
      const response = await fetch(`/api/lessons/${lesson.id}/attempts`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ stepId: "remediation-check", responses: { answer: remediationAnswer }, learnerState }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? "That repair step could not be parsed.");
      setLearnerState(data.learnerState); setFeedback(data.feedback); setRemediationReady(data.correct);
    } catch (error) { setFeedback((error as Error).message); }
    finally { setBusy(false); }
  }

  function insertSymbol(symbol: string) {
    if (lesson.schemaVersion === 2 && step && "fields" in step) {
      const fieldId = activeField || step.fields[0].id;
      setResponses((value) => ({ ...value, [fieldId]: (value[fieldId] ?? "") + symbol }));
    } else setExpression((value) => value + symbol);
    inputRef.current?.focus();
  }

  if (phase === "recap" && transferResult) return <LessonRecap lesson={lesson} learnerState={learnerState} transferResult={transferResult} onReplay={() => { window.localStorage.removeItem(storageKey); window.location.reload(); }} />;
  const checkpoint = lesson.checkpoints.find((item) => item.afterSegmentId === segment.id);
  const remediationCopy = remediationTemplate ? REMEDIATION_COPY[remediationTemplate] : null;
  const remediationSegment = remediationTemplate ? {
    ...segment,
    templateId: remediationTemplate,
    narration: remediationCopy?.narration ?? "Use another representation to inspect the misconception.",
    transcript: remediationCopy?.narration ?? "Use another representation to inspect the misconception.",
    learnerShouldNotice: remediationCopy?.notice ?? ["Use another representation to inspect the misconception"],
  } : segment;
  const completedPracticeCount = learnerState.completedStepIds.filter((id) => id !== "remediation-check").length;
  const progressOffset = phase === "practice" || (phase === "remediation" && storyState.taskStatus === "practice") ? 2 : phase === "transfer" || phase === "recap" ? 3 : 0;

  return (
    <main className="lesson-shell" data-phase={phase}>
      <header className="lesson-header"><Link href="/" className="lesson-brand">AHA</Link><div><span>CALCULUS LAB · DERIVATIVE</span><strong>{lesson.objective}</strong></div><p>{Math.min(100, Math.round(((storyState.currentSegmentIndex + progressOffset) / (lesson.segments.length + 3)) * 100))}%</p></header>
      <section className="lesson-workspace">
        <aside className="lesson-context"><p>MISSION CONTEXT</p><h1>{lesson.storyHook.task}</h1><span>{lesson.storyHook.setting}</span><small>{lesson.storyHook.consequence}</small><ol>{lesson.segments.map((item, index) => <li key={item.id} className={index === storyState.currentSegmentIndex && phase === "lesson" ? "active" : storyState.completedSegmentIds.includes(item.id) ? "complete" : ""}><i>{String(index + 1).padStart(2, "0")}</i>{item.kind.replace("_", " ")}</li>)}</ol></aside>
        <div className="lesson-main">
          {phase === "lesson" ? <>
            {hasManimVideo ? <div className="lesson-visual lesson-video"><video ref={videoRef} key={segment.id} src={segmentAsset?.videoUrl ?? undefined} poster={segmentAsset?.posterUrl ?? undefined} muted playsInline preload="metadata" onLoadedMetadata={() => { const video = videoRef.current; const audio = audioRef.current; if (video && audio?.duration && Number.isFinite(audio.duration)) video.playbackRate = speed * (video.duration / audio.duration); }} onEnded={() => { if (!audioRef.current) setPlaying(false); }} /><div className="lesson-visual__badge"><span>MANIM RENDER · MP4</span><strong>{segment.learnerShouldNotice[0]}</strong></div></div> : <LessonVisual segment={segment} mathModel={lesson.mathModel} reducedMotion={reducedMotion} />}
            {segmentAsset?.audioUrl ? <audio ref={audioRef} key={segment.id} src={segmentAsset.audioUrl} muted={muted} onLoadedMetadata={() => { const video = videoRef.current; const audio = audioRef.current; if (video && audio?.duration && Number.isFinite(audio.duration)) video.playbackRate = speed * (video.duration / audio.duration); }} onEnded={() => setPlaying(false)} preload="metadata" /> : null}
            <div className="lesson-transcript" aria-live="polite"><span>{playing ? "PLAYING" : "PAUSED"}</span><p>{captions ? segment.transcript : "Captions are off"}</p></div>
            <div className="lesson-controls"><button onClick={() => setStoryState((current) => ({ ...current, currentSegmentIndex: Math.max(0, current.currentSegmentIndex - 1) }))} disabled={storyState.currentSegmentIndex === 0}>← Previous</button><button className="lesson-play" onClick={() => setPlaying((value) => !value)}>{playing ? "Pause" : "Play"}</button><button onClick={() => { if (audioRef.current) audioRef.current.currentTime = 0; if (videoRef.current) videoRef.current.currentTime = 0; setPlaying(true); }}>Replay section</button><label>Speed<select value={speed} onChange={(event) => setSpeed(Number(event.target.value))}><option value={0.75}>0.75×</option><option value={1}>1×</option><option value={1.25}>1.25×</option></select></label><button aria-pressed={captions} onClick={() => setCaptions((value) => !value)}>CC</button><button aria-pressed={!muted} onClick={() => setMuted((value) => !value)}>{muted ? "Muted" : "Sound"}</button><button className="lesson-next" onClick={finishSegment}>Complete section →</button></div>
          </> : null}
          {phase === "checkpoint" && checkpoint ? <section className="checkpoint-card" aria-labelledby="checkpoint-title"><p>DIAGNOSTIC PAUSE · {lesson.checkpoints.indexOf(checkpoint) + 1}/2</p><h2 id="checkpoint-title">{checkpoint.prompt}</h2><div className="checkpoint-options">{checkpoint.options.map((option) => <button key={option.id} aria-pressed={checkpointOption === option.id} onClick={() => setCheckpointOption(option.id)}>{option.label}</button>)}</div><button className="checkpoint-submit" disabled={!checkpointOption} onClick={commitCheckpoint}>Submit answer</button></section> : null}
          {phase === "practice" && step ? <section className="practice-card"><p>GUIDED PRACTICE · {practiceStep + 1}/4</p><h2>{lesson.guidedPractice.prompt}</h2><div className="practice-progress">{lesson.guidedPractice.steps.map((item, index) => <span key={item.id} className={index < practiceStep ? "complete" : index === practiceStep ? "active" : ""}>{index + 1}</span>)}</div><p>{step.prompt}</p>{lesson.schemaVersion === 1 ? <><label htmlFor="math-expression">Your expression</label><input ref={inputRef} id="math-expression" value={expression} onChange={(event) => { setExpression(event.target.value); setFeedback(""); }} placeholder={step.placeholder} autoComplete="off"/><div className="math-preview"><span>PREVIEW</span><strong>{expression || "Your expression will appear here"}</strong></div></> : step.fields.map((field, index) => <div key={field.id}><label htmlFor={`math-${field.id}`}>{field.label}</label><input ref={index === 0 ? inputRef : undefined} id={`math-${field.id}`} value={responses[field.id] ?? ""} onFocus={() => setActiveField(field.id)} onChange={(event) => { setResponses((value) => ({ ...value, [field.id]: event.target.value })); setFeedback(""); }} placeholder={field.placeholder} autoComplete="off"/><div className="math-preview"><span>PREVIEW</span><strong>{responses[field.id] || "Your expression will appear here"}</strong></div></div>)}<div className="math-keypad">{["x", "sin(", "cos(", "exp(", "ln(", "^", "(", ")", "+", "-", "*", "/"].map((symbol) => <button key={symbol} onClick={() => insertSymbol(symbol)}>{symbol}</button>)}<button onClick={() => { if (lesson.schemaVersion === 2 && step && "fields" in step) { const fieldId = activeField || step.fields[0].id; setResponses((value) => ({ ...value, [fieldId]: "" })); } else setExpression(""); }}>Clear</button></div>{feedback ? <p className="practice-feedback" role="status">{feedback}</p> : null}<button className="practice-submit" disabled={(lesson.schemaVersion === 1 ? !expression.trim() : !("fields" in step) || !step.fields.every((field) => responses[field.id]?.trim())) || busy} onClick={submitStep}>{busy ? "Checking…" : "Check this step"}</button></section> : null}
          {phase === "remediation" ? <section className="remediation-card"><p>ADAPTIVE REPRESENTATION</p><LessonVisual segment={remediationSegment} mathModel={lesson.schemaVersion === 1 && storyState.taskStatus === "practice" ? lesson.guidedPractice.function : lesson.mathModel} reducedMotion={reducedMotion}/><h2>{remediationSegment.narration}</h2>{lesson.schemaVersion === 2 && storyState.taskStatus === "practice" ? <div className="remediation-check"><label htmlFor="remediation-answer">{lesson.remediationCheck.prompt}</label><input id="remediation-answer" value={remediationAnswer} onChange={(event) => { setRemediationAnswer(event.target.value); setRemediationReady(false); setFeedback(""); }} placeholder="Enter the smaller repair step"/><button disabled={!remediationAnswer.trim() || busy} onClick={submitRemediationCheck}>{busy ? "Checking…" : "Check repair step"}</button>{feedback ? <p role="status">{feedback}</p> : null}</div> : null}<button disabled={lesson.schemaVersion === 2 && storyState.taskStatus === "practice" && !remediationReady} onClick={() => { setRemediationTemplate(null); setFeedback(""); setPhase(storyState.taskStatus === "practice" ? "practice" : "lesson"); if (storyState.taskStatus !== "practice") advanceSegment(); }}>I see the difference — continue</button></section> : null}
          {phase === "transfer" ? <section className="transfer-card"><p>UNASSISTED TRANSFER</p><h2>{lesson.transferTask.prompt}</h2><small>No steps, hints, or remediation. This evidence is recorded separately.</small><input value={transferExpression} onChange={(event) => setTransferExpression(event.target.value)} placeholder="Enter the final result"/><p className="practice-feedback">{feedback}</p><button disabled={!transferExpression.trim() || busy} onClick={submitTransfer}>{busy ? "Checking…" : "Submit transfer answer"}</button></section> : null}
        </div>
        <aside className="lesson-evidence"><p>WHAT TO NOTICE</p>{(phase === "lesson" ? segment.learnerShouldNotice : ["Every step is checked with deterministic algebra", "One answer is learning evidence, not proof of mastery"]).map((notice, index) => <div key={notice}><span>{String(index + 1).padStart(2, "0")}</span><p>{notice}</p></div>)}<footer><strong>{completedPracticeCount}/4</strong><span>practice steps</span></footer></aside>
      </section>
    </main>
  );
}

function LessonRecap({ lesson, learnerState, transferResult, onReplay }: { lesson: DerivativeLessonSpec; learnerState: LessonLearnerState; transferResult: { correct: boolean; normalizedAnswer: string }; onReplay: () => void }) {
  const correctCheckpoints = learnerState.checkpointEvidence.filter((item) => item.correct).length;
  const completedPracticeCount = learnerState.completedStepIds.filter((id) => id !== "remediation-check").length;
  return <main className="lesson-recap"><p>LEARNING EVIDENCE</p><h1>{transferResult.correct ? "You transferred the relationship to a new function." : "The transfer exposed a connection that still needs practice."}</h1><p>The current evidence shows {completedPracticeCount}/4 guided steps completed, {correctCheckpoints}/2 diagnostic answers correct, and an unassisted transfer result that was {transferResult.correct ? "correct" : "not yet correct"}. This is evidence, not a final mastery claim.</p><div><article><span>TRANSFER</span><strong>{transferResult.normalizedAnswer}</strong><small>{transferResult.correct ? "Independent result correct" : "Revisit the selected derivative rule"}</small></article><article><span>POSSIBLE MISCONCEPTIONS</span><strong>{learnerState.possibleMisconceptions.length}</strong><small>{learnerState.possibleMisconceptions.join(" · ") || "No specific misconception recorded"}</small></article></div><button onClick={onReplay}>Replay with another path</button><Link href="/create">Try another derivative question</Link><small>{lesson.objective}</small></main>;
}
