"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState } from "react";

const MOONBASE_SAMPLE =
  "A capsule is launched horizontally from the same height. If its horizontal speed doubles, how do its landing time and horizontal distance change?";
const DETECTIVE_SAMPLE =
  "A medical test is 95% accurate, but only 1% of people have the condition. Why can a positive result still be more likely false than true?";

export function CreateEpisodeForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [sourceInput, setSourceInput] = useState(MOONBASE_SAMPLE);
  const [subject, setSubject] = useState("Physics");
  const [level, setLevel] = useState("Secondary school");
  const [genre, setGenre] = useState<"sci_fi" | "detective">("sci_fi");
  const [language, setLanguage] = useState<"en" | "zh">("en");
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/episodes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sourceInput, subject, level, genre, language }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? "Could not start generation.");
      router.push(`/generate?jobId=${encodeURIComponent(data.jobId)}`);
    } catch (caught) {
      setError((caught as Error).message);
      setSubmitting(false);
    }
  }

  function applySample(kind: "moonbase" | "detective") {
    if (kind === "moonbase") {
      setSourceInput(MOONBASE_SAMPLE);
      setSubject("Physics");
      setGenre("sci_fi");
    } else {
      setSourceInput(DETECTIVE_SAMPLE);
      setSubject("Probability");
      setGenre("detective");
    }
  }

  return (
    <form className="creator-card" onSubmit={submit}>
      <div className="creator-card__topline">
        <span>Episode source</span>
        <span>{sourceInput.length} / 5,000</span>
      </div>
      <label className="sr-only" htmlFor="source-input">
        Question or short notes
      </label>
      <textarea
        id="source-input"
        value={sourceInput}
        onChange={(event) => setSourceInput(event.target.value.slice(0, 5000))}
        placeholder="Paste one question, concept, or short set of notes…"
        rows={7}
      />

      <div className="sample-row" aria-label="Sample prompts">
        <span>Try a proof-ready sample</span>
        <button type="button" onClick={() => applySample("moonbase")}>
          ↗ Projectile motion
        </button>
        <button type="button" onClick={() => applySample("detective")}>
          ◇ Bayes mystery
        </button>
      </div>

      <div className="creator-grid">
        <label>
          <span>Subject</span>
          <select value={subject} onChange={(event) => setSubject(event.target.value)}>
            <option>Physics</option>
            <option>Mathematics</option>
            <option>Probability</option>
            <option>Chemistry</option>
          </select>
        </label>
        <label>
          <span>Level</span>
          <select value={level} onChange={(event) => setLevel(event.target.value)}>
            <option>Secondary school</option>
            <option>Early university</option>
            <option>Middle school</option>
          </select>
        </label>
        <fieldset>
          <legend>Story container</legend>
          <div className="segmented-control">
            <button
              type="button"
              aria-pressed={genre === "sci_fi"}
              onClick={() => setGenre("sci_fi")}
            >
              Sci-fi mission
            </button>
            <button
              type="button"
              aria-pressed={genre === "detective"}
              onClick={() => setGenre("detective")}
            >
              Detective
            </button>
          </div>
        </fieldset>
        <label>
          <span>Narration</span>
          <select value={language} onChange={(event) => setLanguage(event.target.value as "en" | "zh")}>
            <option value="en">English</option>
            <option value="zh">中文</option>
          </select>
        </label>
      </div>

      <div className="creator-actions">
        <input
          ref={fileRef}
          className="sr-only"
          type="file"
          accept="image/png,image/jpeg,application/pdf"
          onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
        />
        <button className="upload-button" type="button" onClick={() => fileRef.current?.click()}>
          <span aria-hidden="true">＋</span>
          {fileName || "Attach one page (optional)"}
        </button>
        <button className="primary-button" type="submit" disabled={submitting || sourceInput.length < 12}>
          {submitting ? "Starting director…" : "Generate adventure"}
          <span aria-hidden="true">→</span>
        </button>
      </div>
      <p className="form-note">
        Exact diagrams are rendered deterministically. AI writes inside a fixed, reviewed story system.
      </p>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </form>
  );
}
