"use client";

import { useRouter } from "next/navigation";
import { type CSSProperties, type DragEvent, type FormEvent, type KeyboardEvent, useRef, useState } from "react";
import { useOnboarding } from "@/components/onboarding/onboarding-shell";
import {
  type EpisodeLevel, getSignalState, isPdfReference, LEVELS, MAX_SOURCE_LENGTH,
} from "@/lib/create/episode-source";
import { DERIVATIVE_SAMPLE } from "@/lib/lesson/constants";
import { LESSON_PIPELINE_STAGES, type LessonJob } from "@/lib/lesson/jobs";

const SIGNAL_LABELS = {
  awaiting: "AWAITING SOURCE",
  incomplete: "SIGNAL INCOMPLETE",
  ready: "READY TO COMPILE",
} as const;

const wait = (duration: number) => new Promise((resolve) => setTimeout(resolve, duration));

export function CreateEpisodeForm() {
  const router = useRouter();
  const { reducedMotion } = useOnboarding();
  const fileRef = useRef<HTMLInputElement>(null);
  const [sourceInput, setSourceInput] = useState("");
  const [level, setLevel] = useState<EpisodeLevel>("Secondary school");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfError, setPdfError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [activeSample, setActiveSample] = useState<"moonbase" | "detective" | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [generationStage, setGenerationStage] = useState("");
  const signalState = getSignalState(sourceInput);
  const ready = signalState === "ready";

  function selectPdf(file?: File) {
    setPdfError("");
    if (!file) return;
    if (!isPdfReference(file)) {
      setPdfError("Choose a PDF file to attach as a reference.");
      return;
    }
    setPdfFile(file);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    if (!submitting) selectPdf(event.dataTransfer.files[0]);
  }

  function applySample(kind: "moonbase" | "detective") {
    if (submitting) return;
    setActiveSample(kind);
    setError("");
    if (kind === "moonbase") {
      setSourceInput(DERIVATIVE_SAMPLE);
    } else {
      setSourceInput("Differentiate f(x)=(x^2+1)^3 and explain the chain rule.");
    }
    window.setTimeout(() => setActiveSample(null), reducedMotion ? 0 : 720);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!ready || submitting) return;
    setError("");
    setSubmitting(true);
    setGenerationStage(LESSON_PIPELINE_STAGES[0]);
    const animationStarted = performance.now();
    try {
      const response = await fetch("/api/lessons", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sourceInput, locale: "en", level: level === "Early university" ? "early_university" : "secondary" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? "Could not start generation.");
      const job = await observeLessonJob(data.jobId, setGenerationStage);
      const minimumTransition = reducedMotion ? 160 : 1050;
      await wait(Math.max(0, minimumTransition - (performance.now() - animationStarted)));
      router.push(`/lesson/${encodeURIComponent(job.lessonId!)}`);
    } catch (caught) {
      setError((caught as Error).message);
      setSubmitting(false);
      setGenerationStage("");
    }
  }

  function handleSourceKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <form className="episode-forge" data-genre="sci_fi" data-signal={signalState}
      data-launching={submitting && !error ? "true" : "false"} onSubmit={submit}>
      <div className="forge-reactor" aria-hidden="true">
        <span className="forge-reactor__axis forge-reactor__axis--horizontal" />
        <span className="forge-reactor__axis forge-reactor__axis--vertical" />
        <span className="forge-reactor__ring forge-reactor__ring--outer" />
        <span className="forge-reactor__ring forge-reactor__ring--inner" />
        <span className="forge-reactor__pulse" />
        <span className="forge-reactor__readout">KNOWLEDGE REACTOR</span>
      </div>

      <section className="question-chamber" aria-labelledby="create-heading">
        <div className="forge-intro">
          <p className="forge-eyebrow"><span>01</span> EPISODE 01 · SOURCE SIGNAL</p>
          <h1 id="create-heading">Give us the question <em>that won&apos;t click.</em></h1>
          <p>We&apos;ll turn it into a world you can test, break, and finally understand.</p>
        </div>

        <div className="source-console">
          <div className="source-console__header">
            <label htmlFor="source-input">YOUR QUESTION</label>
            <span className={`source-status source-status--${signalState}`}><i aria-hidden="true" />{SIGNAL_LABELS[signalState]}</span>
          </div>
          <div className="source-console__field">
            {(["tl", "tr", "bl", "br"] as const).map((corner) =>
              <span key={corner} className={`source-corner source-corner--${corner}`} aria-hidden="true" />)}
            <span className="source-console__scanner" aria-hidden="true" />
            <textarea id="source-input" value={sourceInput} disabled={submitting}
              maxLength={MAX_SOURCE_LENGTH}
              onChange={(event) => { setSourceInput(event.target.value.slice(0, MAX_SOURCE_LENGTH)); setError(""); }}
              onKeyDown={handleSourceKeyDown}
              placeholder="Enter a derivative question, for example: Why does a derivative represent instantaneous rate of change?" rows={7} />
            <span className="source-console__length">SIGNAL LENGTH {String(sourceInput.length).padStart(4, "0")} / {MAX_SOURCE_LENGTH}</span>
          </div>
        </div>

        <div className="forge-utilities">
          <div className="pdf-uplink" data-dragging={dragActive} data-attached={Boolean(pdfFile)}
            onDragEnter={(event) => { event.preventDefault(); if (!submitting) setDragActive(true); }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragActive(false); }}
            onDrop={handleDrop}>
            <input ref={fileRef} className="sr-only" id="pdf-reference" type="file"
              accept="application/pdf,.pdf" disabled={submitting}
              onChange={(event) => { selectPdf(event.target.files?.[0]); event.currentTarget.value = ""; }} />
            <span className="pdf-uplink__icon" aria-hidden="true">PDF</span>
            <div className="pdf-uplink__copy">
              <strong>{pdfFile ? pdfFile.name : "Attach PDF reference"}</strong>
              <span>{pdfFile ? "REFERENCE LOCKED · LOCAL ONLY" : "ONE PDF · OPTIONAL"}</span>
            </div>
            <button type="button" className="pdf-uplink__action" disabled={submitting}
              data-cursor="active" onClick={() => fileRef.current?.click()}>{pdfFile ? "Replace" : "Browse"}</button>
            {pdfFile ? <button type="button" className="pdf-uplink__remove" disabled={submitting}
              aria-label={`Remove ${pdfFile.name}`} data-cursor="active"
              onClick={() => { setPdfFile(null); setPdfError(""); }}>×</button> : null}
          </div>
          {pdfError ? <p className="pdf-uplink__error" role="alert">{pdfError}</p> : null}

          <div className="demo-signals" aria-label="Demo signals">
            <p>LOAD A DEMO SIGNAL</p>
            <div className="demo-signals__grid">
              <button type="button" className={activeSample === "moonbase" ? "is-pulsing" : ""}
                disabled={submitting} data-cursor="active" onClick={() => applySample("moonbase")}>
                <span className="demo-signal__visual demo-signal__visual--orbit" aria-hidden="true"><i /><i /></span>
                <span><strong>Secant to tangent</strong><small>Calculus · Instantaneous change</small></span><b aria-hidden="true">01</b>
              </button>
              <button type="button" className={activeSample === "detective" ? "is-pulsing" : ""}
                disabled={submitting} data-cursor="active" data-cursor-color="violet" onClick={() => applySample("detective")}>
                <span className="demo-signal__visual demo-signal__visual--evidence" aria-hidden="true"><i /><i /><i /></span>
                <span><strong>Chain rule mission</strong><small>Calculus · Dynamic Manim lesson</small></span><b aria-hidden="true">02</b>
              </button>
            </div>
          </div>
        </div>
      </section>

      <aside className="world-parameters" aria-labelledby="parameters-heading">
        <header className="world-parameters__header">
          <div><span>DIRECTOR CONSOLE</span><h2 id="parameters-heading">World parameters</h2></div>
          <p><i aria-hidden="true" />03 SYSTEMS ONLINE</p>
        </header>
        <fieldset className="parameter-block parameter-subject parameter-fixed">
          <legend><span>01</span> Subject</legend>
          <div className="subject-selector"><button type="button" aria-pressed="true" disabled>Calculus · Derivatives</button></div>
        </fieldset>
        <fieldset className="parameter-block parameter-level" disabled={submitting}>
          <legend><span>02</span> Learning level</legend>
          <div className="level-calibrator" style={{ "--level-index": LEVELS.indexOf(level) } as CSSProperties}>
            <span className="level-calibrator__track" aria-hidden="true"><i /></span>
            {LEVELS.map((option) => <button key={option} type="button" aria-pressed={level === option}
              data-cursor="active" onClick={() => setLevel(option)}><i aria-hidden="true" /><span>{option}</span></button>)}
          </div>
        </fieldset>
        <fieldset className="parameter-block parameter-world parameter-fixed">
          <legend><span>03</span> Story world</legend>
          <div className="world-selector">
            <button type="button" aria-pressed="true" disabled>
              <span className="world-card__visual world-card__visual--scifi" aria-hidden="true"><i /><i /><i /></span>
              <span className="world-card__copy"><strong>VISUAL CALCULUS LAB</strong><small>Story motivates. Deterministic visuals explain.</small></span><b>01</b>
            </button>
          </div>
        </fieldset>

        {error ? <div className="forge-error" role="alert"><span aria-hidden="true">!</span>
          <p><strong>SIGNAL INTERRUPTED</strong>{error}</p></div> : null}
        <div className="forge-launch">
          <div className="forge-launch__rail" aria-hidden="true"><i /><i /><i /></div>
          <button type="submit" disabled={!ready || submitting} data-cursor="active" className="forge-launch__button">
            <span><small>{submitting ? generationStage || "COMPILING SOURCE" : error ? "SYSTEM RECOVERED" : ready ? "DIRECTOR READY" : "SOURCE REQUIRED"}</small>
              <strong>{error ? "Try again" : "Generate visual lesson"}</strong></span><i aria-hidden="true"><b>→</b></i>
          </button>
          <p>CMD / CTRL + ENTER TO LAUNCH</p>
        </div>
      </aside>

      <div className="forge-data-stream" aria-hidden="true">
        {Array.from({ length: 14 }, (_, index) => <i key={index} />)}
      </div>
    </form>
  );
}

async function observeLessonJob(jobId: string, onStage: (stage: string) => void): Promise<LessonJob> {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const response = await fetch(`/api/lesson-jobs/${encodeURIComponent(jobId)}`, { cache: "no-store" });
    if (!response.ok) throw new Error("The lesson job is temporarily unavailable. Please retry.");
    const job = await response.json() as LessonJob;
    onStage(`${LESSON_PIPELINE_STAGES[job.stageIndex]} · ${Math.round(job.progress)}%`);
    if (job.status === "complete" && job.lessonId) return job;
    if (job.status === "error") throw new Error(job.error?.message ?? "Lesson generation failed. Please retry.");
    await wait(500);
  }
  throw new Error("Lesson rendering timed out. Retry or use the seeded derivative example.");
}
