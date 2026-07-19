"use client";

import { useRouter } from "next/navigation";
import { type CSSProperties, type DragEvent, type FormEvent, type KeyboardEvent, useRef, useState } from "react";
import { useOnboarding } from "@/components/onboarding/onboarding-shell";
import {
  createEpisodePayload, DETECTIVE_SAMPLE, type EpisodeGenre, type EpisodeLevel,
  type EpisodeSubject, getSignalState, isPdfReference, LEVELS, MAX_SOURCE_LENGTH,
  MOONBASE_SAMPLE, SUBJECTS,
} from "@/lib/create/episode-source";

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
  const [subject, setSubject] = useState<EpisodeSubject>("Physics");
  const [level, setLevel] = useState<EpisodeLevel>("Secondary school");
  const [genre, setGenre] = useState<EpisodeGenre>("sci_fi");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfError, setPdfError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [activeSample, setActiveSample] = useState<"moonbase" | "detective" | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
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
      setSourceInput(MOONBASE_SAMPLE);
      setSubject("Physics");
      setGenre("sci_fi");
    } else {
      setSourceInput(DETECTIVE_SAMPLE);
      setSubject("Probability");
      setGenre("detective");
    }
    window.setTimeout(() => setActiveSample(null), reducedMotion ? 0 : 720);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!ready || submitting) return;
    setError("");
    setSubmitting(true);
    const animationStarted = performance.now();
    try {
      const response = await fetch("/api/episodes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(createEpisodePayload({ sourceInput, subject, level, genre })),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? "Could not start generation.");
      const minimumTransition = reducedMotion ? 160 : 1050;
      await wait(Math.max(0, minimumTransition - (performance.now() - animationStarted)));
      router.push(`/generate?jobId=${encodeURIComponent(data.jobId)}`);
    } catch (caught) {
      setError((caught as Error).message);
      setSubmitting(false);
    }
  }

  function handleSourceKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <form className="episode-forge" data-genre={genre} data-signal={signalState}
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
              placeholder="Paste a question, problem, or concept you want to finally understand..." rows={7} />
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
                <span><strong>Moonbase trajectory</strong><small>Physics · Sci-fi mission</small></span><b aria-hidden="true">01</b>
              </button>
              <button type="button" className={activeSample === "detective" ? "is-pulsing" : ""}
                disabled={submitting} data-cursor="active" data-cursor-color="violet" onClick={() => applySample("detective")}>
                <span className="demo-signal__visual demo-signal__visual--evidence" aria-hidden="true"><i /><i /><i /></span>
                <span><strong>The false-positive case</strong><small>Probability · Detective mystery</small></span><b aria-hidden="true">02</b>
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
        <fieldset className="parameter-block parameter-subject" disabled={submitting}>
          <legend><span>01</span> Subject</legend>
          <div className="subject-selector">{SUBJECTS.map((option) =>
            <button key={option} type="button" aria-pressed={subject === option} data-cursor="active"
              onClick={() => setSubject(option)}>{option}</button>)}</div>
        </fieldset>
        <fieldset className="parameter-block parameter-level" disabled={submitting}>
          <legend><span>02</span> Learning level</legend>
          <div className="level-calibrator" style={{ "--level-index": LEVELS.indexOf(level) } as CSSProperties}>
            <span className="level-calibrator__track" aria-hidden="true"><i /></span>
            {LEVELS.map((option) => <button key={option} type="button" aria-pressed={level === option}
              data-cursor="active" onClick={() => setLevel(option)}><i aria-hidden="true" /><span>{option}</span></button>)}
          </div>
        </fieldset>
        <fieldset className="parameter-block parameter-world" disabled={submitting}>
          <legend><span>03</span> Story world</legend>
          <div className="world-selector">
            <button type="button" aria-pressed={genre === "sci_fi"} data-cursor="active" onClick={() => setGenre("sci_fi")}>
              <span className="world-card__visual world-card__visual--scifi" aria-hidden="true"><i /><i /><i /></span>
              <span className="world-card__copy"><strong>SCI-FI MISSION</strong><small>A failing system. One concept is the way out.</small></span><b>01</b>
            </button>
            <button type="button" aria-pressed={genre === "detective"} data-cursor="active" data-cursor-color="violet"
              onClick={() => setGenre("detective")}>
              <span className="world-card__visual world-card__visual--detective" aria-hidden="true"><i /><i /><i /></span>
              <span className="world-card__copy"><strong>DETECTIVE MYSTERY</strong><small>Conflicting evidence. One relationship reveals the truth.</small></span><b>02</b>
            </button>
          </div>
        </fieldset>

        {error ? <div className="forge-error" role="alert"><span aria-hidden="true">!</span>
          <p><strong>SIGNAL INTERRUPTED</strong>{error}</p></div> : null}
        <div className="forge-launch">
          <div className="forge-launch__rail" aria-hidden="true"><i /><i /><i /></div>
          <button type="submit" disabled={!ready || submitting} data-cursor="active" className="forge-launch__button">
            <span><small>{submitting ? "COMPILING SOURCE" : error ? "SYSTEM RECOVERED" : ready ? "DIRECTOR READY" : "SOURCE REQUIRED"}</small>
              <strong>{error ? "Try again" : "Generate adventure"}</strong></span><i aria-hidden="true"><b>→</b></i>
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
