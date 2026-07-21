"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { WhiteboardStage } from "@/components/lesson/whiteboard-stage";
import { WordCaptions } from "@/components/lesson/word-captions";
import type { LessonSpecV3 } from "@/lib/lesson/schema";
import { parseElevenLabsAlignment, wordTimings, type NarrationAlignment } from "@/lib/media/alignment";

type Phase = "segment" | "checkpoint" | "recap";

type CheckpointEvidence = { checkpointId: string; selectedIndex: number; correct: boolean };

type PersistedState = {
  phase: Phase;
  currentSegmentIndex: number;
  completedSegmentIds: string[];
  checkpointEvidence: CheckpointEvidence[];
};

export function WhiteboardLessonPlayer({ lesson: initialLesson }: { lesson: LessonSpecV3 }) {
  const storageKey = `plot-as-proof:lesson:${initialLesson.id}`;
  const [lesson, setLesson] = useState(initialLesson);
  const [phase, setPhase] = useState<Phase>("segment");
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [completedSegmentIds, setCompletedSegmentIds] = useState<string[]>([]);
  const [checkpointEvidence, setCheckpointEvidence] = useState<CheckpointEvidence[]>([]);
  const [checkpointSelection, setCheckpointSelection] = useState<number | null>(null);
  const [checkpointResult, setCheckpointResult] = useState<{ correct: boolean } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [captions, setCaptions] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [alignments, setAlignments] = useState<Record<string, NarrationAlignment | null>>({});

  const clockRef = useRef({ ms: 0 });
  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const seekRef = useRef<HTMLInputElement>(null);
  const scrubbingRef = useRef(false);
  const pendingLessonRef = useRef<LessonSpecV3 | null>(null);
  const playingRef = useRef(false);
  playingRef.current = playing;
  const speedRef = useRef(1);
  speedRef.current = speed;
  const reducedMotion = useMemo(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);

  const segment = lesson.segments[currentSegmentIndex];
  const asset = lesson.assets.segments.find((item) => item.segmentId === segment.id);
  const durationMs = asset?.durationMs ?? segment.durationMs;
  const hasManimVideo = !reducedMotion && asset?.renderMode === "manim" && Boolean(asset.videoUrl);
  const alignment = alignments[segment.id] ?? null;
  const timings = useMemo(() => alignment?.original ? wordTimings(alignment.original) : null, [alignment]);

  /* Restoring a persisted learning session intentionally initializes several independent state slices after hydration. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return;
    try {
      const value = JSON.parse(saved) as PersistedState;
      setPhase(value.phase);
      setCurrentSegmentIndex(Math.min(value.currentSegmentIndex, initialLesson.segments.length - 1));
      setCompletedSegmentIds(value.completedSegmentIds);
      setCheckpointEvidence(value.checkpointEvidence);
    } catch { window.localStorage.removeItem(storageKey); }
  }, [storageKey, initialLesson.segments.length]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    const state: PersistedState = { phase, currentSegmentIndex, completedSegmentIds, checkpointEvidence };
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  }, [phase, currentSegmentIndex, completedSegmentIds, checkpointEvidence, storageKey]);

  // Track B hot-swap: while any segment still has a pending cinematic render,
  // poll the lesson and swap upgraded segments in. The currently playing
  // segment is deferred to a pause or section boundary so playback never
  // jumps mid-sentence.
  useEffect(() => {
    if (!lesson.upgrade.trackB.some((entry) => entry.status === "pending")) return;
    const deadline = Date.now() + 12 * 60_000;
    const interval = window.setInterval(async () => {
      if (Date.now() > deadline) { window.clearInterval(interval); return; }
      try {
        const response = await fetch(`/api/lessons/${lesson.id}`, { cache: "no-store" });
        if (!response.ok) return;
        const payload = await response.json() as { lesson?: { schemaVersion?: number } };
        if (payload.lesson?.schemaVersion !== 3) return;
        const next = payload.lesson as LessonSpecV3;
        const currentChanged = JSON.stringify(next.assets.segments.find((item) => item.segmentId === segment.id))
          !== JSON.stringify(lesson.assets.segments.find((item) => item.segmentId === segment.id));
        if (currentChanged && playingRef.current) pendingLessonRef.current = next;
        else setLesson(next);
      } catch { /* skip this cycle; a torn write or network blip resolves on the next poll */ }
    }, 5_000);
    return () => window.clearInterval(interval);
  }, [lesson, segment.id]);

  useEffect(() => {
    const url = asset?.alignmentUrl;
    if (!url || alignments[segment.id] !== undefined) return;
    let cancelled = false;
    fetch(url).then((response) => response.ok ? response.json() : null).then((payload) => {
      if (!cancelled) setAlignments((current) => ({ ...current, [segment.id]: payload ? parseElevenLabsAlignment(payload) : null }));
    }).catch(() => {
      if (!cancelled) setAlignments((current) => ({ ...current, [segment.id]: null }));
    });
    return () => { cancelled = true; };
  }, [asset?.alignmentUrl, segment.id, alignments]);

  // Drive media playback and rate in response to play/pause and speed.
  useEffect(() => {
    const audio = audioRef.current;
    const video = videoRef.current;
    if (audio) audio.playbackRate = speed;
    if (video) {
      video.playbackRate = audio?.duration && Number.isFinite(audio.duration) && video.duration && Number.isFinite(video.duration)
        ? speed * (video.duration / audio.duration)
        : speed;
    }
    if (playing) {
      if (audio) void audio.play().catch(() => setPlaying(false));
      if (video) void video.play().catch(() => setPlaying(false));
    } else {
      audio?.pause(); video?.pause();
    }
  }, [playing, speed, currentSegmentIndex]);

  // A single persistent clock loop per segment drives the whiteboard timeline,
  // captions, and the seek bar. It reads play state and speed from refs so it
  // never restarts on a play/pause/speed change (which would stack loops or
  // capture stale state). Source of truth: narration audio, else upgraded
  // video, else a synthetic clock so quota-exhausted lessons still animate.
  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      // Cap the step so returning to a backgrounded tab (where rAF was paused)
      // resumes smoothly instead of jumping by the whole hidden duration.
      const delta = Math.min(now - last, 100);
      last = now;
      const audio = audioRef.current;
      const video = videoRef.current;
      if (audio) clockRef.current.ms = audio.currentTime * 1_000;
      else if (video) clockRef.current.ms = video.currentTime * 1_000;
      else if (playingRef.current) {
        clockRef.current.ms = Math.min(clockRef.current.ms + delta * speedRef.current, durationMs);
        if (clockRef.current.ms >= durationMs) setPlaying(false);
      }
      // While the learner is dragging the thumb, the input owns its value;
      // writing to it every frame would snap the thumb back and make the bar
      // impossible to drag.
      if (seekRef.current && !scrubbingRef.current) seekRef.current.value = String(Math.round(clockRef.current.ms));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [currentSegmentIndex, durationMs]);

  function beginScrub() {
    scrubbingRef.current = true;
    // The pointer can be released anywhere on the page (or even outside the
    // window), so the drag must end on window-level events — waiting for a
    // pointerup on the input itself would leave the bar frozen.
    const endScrub = () => {
      scrubbingRef.current = false;
      window.removeEventListener("pointerup", endScrub);
      window.removeEventListener("pointercancel", endScrub);
    };
    window.addEventListener("pointerup", endScrub);
    window.addEventListener("pointercancel", endScrub);
  }

  function seekTo(ms: number) {
    clockRef.current.ms = ms;
    const audio = audioRef.current;
    const video = videoRef.current;
    if (audio) audio.currentTime = ms / 1_000;
    if (video) {
      // An upgraded segment's video is rate-locked to the narration, so its
      // position must be scaled by the duration ratio when both exist.
      const scale = audio?.duration && Number.isFinite(audio.duration) && video.duration && Number.isFinite(video.duration)
        ? video.duration / audio.duration
        : 1;
      video.currentTime = (ms / 1_000) * scale;
    }
  }

  function applyPendingUpgrade() {
    if (pendingLessonRef.current) {
      setLesson(pendingLessonRef.current);
      pendingLessonRef.current = null;
    }
  }

  function finishSegment() {
    setPlaying(false);
    applyPendingUpgrade();
    setCompletedSegmentIds((current) => Array.from(new Set([...current, segment.id])));
    if (segment.checkpoint) {
      setCheckpointSelection(null);
      setCheckpointResult(null);
      setPhase("checkpoint");
      return;
    }
    advanceSegment();
  }

  function advanceSegment() {
    setPlaying(false);
    applyPendingUpgrade();
    seekTo(0);
    if (currentSegmentIndex >= lesson.segments.length - 1) { setPhase("recap"); return; }
    setCurrentSegmentIndex((value) => value + 1);
    setPhase("segment");
  }

  function replaySegment() {
    seekTo(0);
    setPhase("segment");
    setPlaying(true);
  }

  function commitCheckpoint() {
    const checkpoint = segment.checkpoint;
    if (!checkpoint || checkpointSelection === null) return;
    const correct = checkpointSelection === checkpoint.correctIndex;
    setCheckpointEvidence((current) => [
      ...current.filter((item) => item.checkpointId !== checkpoint.id),
      { checkpointId: checkpoint.id, selectedIndex: checkpointSelection, correct },
    ]);
    setCheckpointResult({ correct });
  }

  const totalCheckpoints = lesson.segments.filter((item) => item.checkpoint).length;
  const correctCheckpoints = checkpointEvidence.filter((item) => item.correct).length;

  if (phase === "recap") {
    return (
      <main className="lesson-recap">
        <p>LEARNING EVIDENCE</p>
        <h1>{correctCheckpoints === totalCheckpoints && totalCheckpoints > 0 ? "You followed every idea in this lesson." : "You finished the lesson — some ideas deserve a second look."}</h1>
        <p>You completed {completedSegmentIds.length}/{lesson.segments.length} sections with {correctCheckpoints}/{totalCheckpoints} check questions answered correctly. This is evidence of engagement, not a final mastery claim.</p>
        <div>
          <article><span>TOPIC</span><strong>{lesson.topic}</strong><small>{lesson.objective}</small></article>
          <article><span>CHECKPOINTS</span><strong>{correctCheckpoints}/{totalCheckpoints}</strong><small>{correctCheckpoints === totalCheckpoints ? "All checks correct" : "Replay the sections you missed"}</small></article>
        </div>
        <button onClick={() => { window.localStorage.removeItem(storageKey); window.location.reload(); }}>Replay this lesson</button>
        <Link href="/create">Ask another question</Link>
        <small>{lesson.objective}</small>
      </main>
    );
  }

  const checkpoint = segment.checkpoint;

  return (
    <main className="lesson-shell" data-phase={phase}>
      <header className="lesson-header">
        <Link href="/" className="lesson-brand">PLOT AS PROOF</Link>
        <div><span>{lesson.topic.toUpperCase()}</span><strong>{lesson.objective}</strong></div>
        <p>{Math.min(100, Math.round(((currentSegmentIndex + (phase === "checkpoint" ? 1 : 0)) / (lesson.segments.length + 1)) * 100))}%</p>
      </header>
      <section className="lesson-workspace">
        <aside className="lesson-context">
          <p>MISSION CONTEXT</p>
          <h1>{lesson.storyHook.task}</h1>
          <span>{lesson.storyHook.setting}</span>
          <small>{lesson.storyHook.consequence}</small>
          <ol>
            {lesson.segments.map((item, index) => (
              <li key={item.id} className={index === currentSegmentIndex && phase === "segment" ? "active" : completedSegmentIds.includes(item.id) ? "complete" : ""}>
                <i>{String(index + 1).padStart(2, "0")}</i>{item.title}
              </li>
            ))}
          </ol>
        </aside>
        <div className="lesson-main">
          {phase === "segment" ? (
            <>
              {hasManimVideo ? (
                <div className="lesson-visual lesson-video">
                  <video ref={videoRef} key={segment.id} src={asset?.videoUrl ?? undefined} poster={asset?.posterUrl ?? undefined}
                    muted playsInline preload="metadata"
                    onLoadedMetadata={() => {
                      const video = videoRef.current; const audio = audioRef.current;
                      if (video && audio?.duration && Number.isFinite(audio.duration)) video.playbackRate = speed * (video.duration / audio.duration);
                    }}
                    onEnded={() => { if (!audioRef.current) setPlaying(false); }} />
                  <div className="lesson-visual__badge"><span>CINEMATIC RENDER · MP4</span><strong>{segment.learnerShouldNotice[0]}</strong></div>
                </div>
              ) : (
                <WhiteboardStage key={segment.id} segment={segment} alignment={alignment} durationMs={durationMs} clockRef={clockRef} reducedMotion={reducedMotion} />
              )}
              {asset?.audioUrl ? (
                <audio ref={audioRef} key={`audio-${segment.id}`} src={asset.audioUrl} muted={muted} preload="metadata"
                  onEnded={() => setPlaying(false)} />
              ) : null}
              <div className="lesson-transcript" aria-live="polite">
                <span>{playing ? "PLAYING" : "PAUSED"}</span>
                {captions ? (
                  <WordCaptions narration={segment.narration} transcript={segment.transcript} timings={timings} clockRef={clockRef} playing={playing} />
                ) : <p>Captions are off</p>}
              </div>
              <div className="whiteboard-seek">
                <input ref={seekRef} type="range" min={0} max={durationMs} defaultValue={0} step={100}
                  aria-label="Seek within this section"
                  onPointerDown={beginScrub}
                  onChange={(event) => seekTo(Number(event.target.value))} />
              </div>
              <div className="lesson-controls">
                <button onClick={() => { setPlaying(false); seekTo(0); setCurrentSegmentIndex((value) => Math.max(0, value - 1)); }} disabled={currentSegmentIndex === 0}>← Previous</button>
                <button className="lesson-play" onClick={() => { if (playing) applyPendingUpgrade(); setPlaying((value) => !value); }}>{playing ? "Pause" : "Play"}</button>
                <button onClick={() => { seekTo(0); setPlaying(true); }}>Replay section</button>
                <label>Speed
                  <select value={speed} onChange={(event) => setSpeed(Number(event.target.value))}>
                    <option value={0.75}>0.75×</option><option value={1}>1×</option><option value={1.25}>1.25×</option>
                  </select>
                </label>
                <button aria-pressed={captions} onClick={() => setCaptions((value) => !value)}>CC</button>
                <button aria-pressed={!muted} onClick={() => setMuted((value) => !value)}>{muted ? "Muted" : "Sound"}</button>
                <button className="lesson-next" onClick={finishSegment}>Complete section →</button>
              </div>
            </>
          ) : null}
          {phase === "checkpoint" && checkpoint ? (
            <section className="checkpoint-card" aria-labelledby="checkpoint-title">
              <p>QUICK CHECK</p>
              <h2 id="checkpoint-title">{checkpoint.prompt}</h2>
              <div className="checkpoint-options">
                {checkpoint.options.map((option, index) => (
                  <button key={option.id} aria-pressed={checkpointSelection === index}
                    disabled={checkpointResult !== null}
                    onClick={() => setCheckpointSelection(index)}>{option.text}</button>
                ))}
              </div>
              {checkpointResult === null ? (
                <button className="checkpoint-submit" disabled={checkpointSelection === null} onClick={commitCheckpoint}>Submit answer</button>
              ) : (
                <div className="checkpoint-outcome" data-correct={checkpointResult.correct}>
                  <strong>{checkpointResult.correct ? "Correct." : "Not quite."}</strong>
                  <p>{checkpoint.explanation}</p>
                  <div className="checkpoint-outcome__actions">
                    {!checkpointResult.correct ? <button onClick={replaySegment}>Replay this section</button> : null}
                    <button className="checkpoint-submit" onClick={advanceSegment}>Continue →</button>
                  </div>
                </div>
              )}
            </section>
          ) : null}
        </div>
        <aside className="lesson-evidence">
          <p>WHAT TO NOTICE</p>
          {segment.learnerShouldNotice.map((notice, index) => (
            <div key={notice}><span>{String(index + 1).padStart(2, "0")}</span><p>{notice}</p></div>
          ))}
          <footer><strong>{correctCheckpoints}/{totalCheckpoints}</strong><span>checks correct</span></footer>
        </aside>
      </section>
    </main>
  );
}
