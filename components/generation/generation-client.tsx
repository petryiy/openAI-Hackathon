"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { EpisodeSpec } from "@/lib/episode/schema";
import { PIPELINE_STAGES, type GenerationJob } from "@/lib/jobs/schema";

export function GenerationClient() {
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId");
  const [job, setJob] = useState<GenerationJob | null>(null);
  const [episode, setEpisode] = useState<EpisodeSpec | null>(null);
  const [networkError, setNetworkError] = useState("");
  const [repairing, setRepairing] = useState(false);
  const [repairError, setRepairError] = useState("");

  const poll = useCallback(async () => {
    if (!jobId) return;
    try {
      const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? "Generation job not found.");
      setJob(data);
      if (data.status === "complete" && data.episodeId) {
        const episodeResponse = await fetch(`/api/episodes/${encodeURIComponent(data.episodeId)}`);
        const episodeData = await episodeResponse.json();
        if (episodeResponse.ok) setEpisode(episodeData.episode);
      }
    } catch (error) {
      setNetworkError((error as Error).message);
    }
  }, [jobId]);

  useEffect(() => {
    if (job?.status === "complete" || job?.status === "error") return;
    const initialTimer = window.setTimeout(() => void poll(), 0);
    const timer = window.setInterval(() => void poll(), 500);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, [job?.status, poll]);

  async function repairDraft() {
    if (!jobId) return;
    setRepairing(true);
    setRepairError("");
    try {
      const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/repair`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message ?? "The saved draft could not be repaired.");
      }
      setJob(data);
      if (data.episodeId) {
        const episodeResponse = await fetch(
          `/api/episodes/${encodeURIComponent(data.episodeId)}`,
        );
        const episodeData = await episodeResponse.json();
        if (episodeResponse.ok) setEpisode(episodeData.episode);
      }
    } catch (error) {
      setRepairError((error as Error).message);
    } finally {
      setRepairing(false);
    }
  }

  if (!jobId) {
    return <GenerationError message="No generation job was supplied." />;
  }
  if (networkError) {
    return <GenerationError message={networkError} />;
  }

  return (
    <section className="generation-layout">
      <div className="generation-progress-panel">
        <p className="eyebrow"><span>02</span> Director pipeline</p>
        <h1>{job?.status === "complete" ? "Your story has a teaching plan." : "Building cause and effect…"}</h1>
        <p className="generation-intro">
          Each stage produces evidence for the next. The episode is published only after its story,
          pedagogy, visualization, and render gates pass.
        </p>
        <div className="pipeline-list">
          {PIPELINE_STAGES.map((stage, index) => {
            const paused = (job?.stageIndex ?? 0) === index && job?.status === "error";
            const active = (job?.stageIndex ?? 0) === index && job?.status !== "complete" && !paused;
            const complete = job?.status === "complete" || (job?.stageIndex ?? -1) > index;
            return (
              <div className={`pipeline-step ${active ? "is-active" : ""} ${paused ? "is-paused" : ""} ${complete ? "is-complete" : ""}`} key={stage}>
                <span className="pipeline-index">{complete ? "✓" : paused ? "!" : String(index + 1).padStart(2, "0")}</span>
                <div><strong>{stage}</strong><small>{paused ? "Paused" : active ? "Working now" : complete ? "Evidence saved" : "Waiting"}</small></div>
              </div>
            );
          })}
        </div>
        <div className="overall-progress" aria-label={`${job?.progress ?? 4}% complete`}>
          <span style={{ width: `${job?.progress ?? 4}%` }} />
        </div>
        <div className="progress-caption"><span>{job?.progress ?? 4}%</span><span>Structured, validated, resumable</span></div>
      </div>

      <div className="blueprint-panel">
        {job?.status === "error" ? (
          <div className="generation-error-card">
            <span className="error-symbol">!</span>
            <p className="eyebrow">
              {job.error?.recoverable ? "Recoverable pause" : "Integration pause"}
            </p>
            <h2>{generationErrorHeading(job.error?.code)}</h2>
            <p>{job.error?.message}</p>
            {repairError ? <p role="alert">{repairError}</p> : null}
            <div className="button-row">
              {job.error?.code === "EPISODE_VALIDATION_FAILED" && job.draftId ? (
                <button
                  className="primary-button"
                  type="button"
                  disabled={repairing}
                  onClick={repairDraft}
                >
                  {repairing ? "Repairing saved draft…" : "Repair saved draft →"}
                </button>
              ) : (
              <Link className="primary-button" href="/episode/moonbase-last-shot">Play offline Moonbase demo →</Link>
              )}
              <Link className="text-button" href="/">Use a different source</Link>
            </div>
          </div>
        ) : episode ? (
          <Blueprint episode={episode} />
        ) : (
          <BlueprintSkeleton stage={job?.stageIndex ?? 0} />
        )}
      </div>
    </section>
  );
}

function generationErrorHeading(code?: string) {
  switch (code) {
    case "OPENAI_QUOTA_EXHAUSTED":
      return "The API project needs available quota.";
    case "OPENAI_RATE_LIMITED":
      return "The director is at capacity.";
    case "OPENAI_AUTH_FAILED":
    case "OPENAI_API_KEY_REQUIRED":
      return "The model connection needs attention.";
    case "OPENAI_MODEL_ACCESS_DENIED":
      return "This project cannot access the selected model.";
    case "EPISODE_VALIDATION_FAILED":
      return "This draft did not pass the teaching gate.";
    default:
      return "Generation paused before publication.";
  }
}

function Blueprint({ episode }: { episode: EpisodeSpec }) {
  return (
    <div className="blueprint">
      <div className="blueprint-heading">
        <div><p className="eyebrow">Approved blueprint</p><h2>{episode.title}</h2></div>
        <span className="gate-badge">4 gates passed</span>
      </div>
      <div className="blueprint-objective">
        <small>Learning objective</small>
        <p>{episode.learningObjective}</p>
      </div>
      <div className="blueprint-story">
        <div><small>One-room premise</small><p>{episode.storyBible.premise}</p></div>
        <div><small>Clock</small><p>{episode.storyBible.tickingClock}</p></div>
      </div>
      <div className="character-strip">
        {episode.storyBible.characters.map((character, index) => (
          <div key={character.id}>
            <span className={`mini-avatar avatar-${index + 1}`}>{character.name.slice(0, 1)}</span>
            <p><strong>{character.name}</strong><small>{character.role}</small></p>
          </div>
        ))}
      </div>
      <div className="choice-blueprints">
        {episode.choiceNodes.map((choice, index) => (
          <article key={choice.id}>
            <span>Decision {index + 1}</span>
            <p>{choice.prompt}</p>
            <small>{index === 0 ? "Diagnoses the learner's starting model" : "Changes one condition to test adaptation"}</small>
          </article>
        ))}
      </div>
      <div className="blueprint-rule">
        <span aria-hidden="true">↗</span>
        <p><strong>Plot as Proof</strong>{episode.storyBible.runningGag}</p>
      </div>
      <Link className="primary-button blueprint-cta" href={`/episode/${episode.id}`}>
        Enter the episode <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}

function BlueprintSkeleton({ stage }: { stage: number }) {
  return (
    <div className="blueprint blueprint--skeleton" aria-live="polite">
      <div className="scanner" />
      <p className="eyebrow">Live storyboard</p>
      <h2>{stage < 2 ? "Finding the relationship…" : stage < 4 ? "Making the concept control the plot…" : "Composing the cockpit…"}</h2>
      <div className="skeleton-block large" />
      <div className="skeleton-row"><div className="skeleton-block" /><div className="skeleton-block" /></div>
      <div className="skeleton-block medium" />
      <p className="skeleton-caption">The director is not generating arbitrary video. It is building a constrained, testable episode specification.</p>
    </div>
  );
}

function GenerationError({ message }: { message: string }) {
  return (
    <div className="standalone-error">
      <h1>We lost the generation job.</h1><p>{message}</p><Link href="/">Return to create</Link>
    </div>
  );
}
