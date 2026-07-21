"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useOnboarding } from "@/components/onboarding/onboarding-shell";
import {
  DIRECTOR_STAGES,
  getGenerationStartDelay,
  getObservationDelay,
  isTransientGenerationError,
} from "@/lib/generation/client-flow";
import type { GenerationJob } from "@/lib/jobs/schema";

export function GenerationClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { reducedMotion, setExperiencePhase } = useOnboarding();
  const jobId = searchParams.get("jobId");
  const [job, setJob] = useState<GenerationJob | null>(null);
  const [message, setMessage] = useState("");
  const [repairing, setRepairing] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startedAtRef = useRef(0);
  const driverStartedRef = useRef(false);
  const navigationStartedRef = useRef(false);

  const readJob = useCallback(async (observeOnly: boolean) => {
    if (!jobId) return null;
    const suffix = observeOnly ? "?observe=1" : "";
    const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}${suffix}`, {
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message ?? "Generation job not found.");
    setMessage("");
    setJob((current) => current?.status === "complete" ? current : data);
    return data as GenerationJob;
  }, [jobId]);

  useEffect(() => {
    setExperiencePhase("compiling");
    return () => setExperiencePhase("create");
  }, [setExperiencePhase]);

  useEffect(() => {
    if (!jobId) return;
    startedAtRef.current = Date.now();
    driverStartedRef.current = false;
    navigationStartedRef.current = false;
    let stopped = false;
    let observationTimer = 0;
    let driverTimer = 0;

    async function observe() {
      try {
        const latest = await readJob(true);
        if (!latest || stopped || latest.status === "complete" || latest.status === "error") return;
        observationTimer = window.setTimeout(observe, getObservationDelay(Date.now() - startedAtRef.current));
      } catch (error) {
        if (!stopped) {
          setMessage((error as Error).message);
          observationTimer = window.setTimeout(observe, 3_000);
        }
      }
    }

    async function initialize() {
      try {
        const initial = await readJob(true);
        if (!initial || stopped) return;
        if (initial.status !== "complete" && initial.status !== "error" && !driverStartedRef.current) {
          driverTimer = window.setTimeout(async () => {
            driverStartedRef.current = true;
            try {
              await readJob(false);
            } catch (error) {
              if (!stopped) setMessage((error as Error).message);
            }
          }, getGenerationStartDelay(initial.createdAt));
          observationTimer = window.setTimeout(observe, 750);
        }
      } catch (error) {
        setMessage((error as Error).message);
      }
    }

    void initialize();
    return () => {
      stopped = true;
      window.clearTimeout(observationTimer);
      window.clearTimeout(driverTimer);
    };
  }, [jobId, readJob]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (startedAtRef.current) setElapsed(Date.now() - startedAtRef.current);
    }, 1_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (job?.status !== "complete" || !job.episodeId || navigationStartedRef.current) return;
    navigationStartedRef.current = true;
    const destination = `/episode/${job.episodeId}`;
    async function enterEpisode() {
      try {
        const response = await fetch(`/api/episodes/${encodeURIComponent(job!.episodeId!)}`);
        if (!response.ok) throw new Error("The finished episode could not be loaded.");
        router.prefetch(destination);
        setExperiencePhase("episode-ready");
        window.setTimeout(() => router.replace(destination), reducedMotion ? 180 : 900);
      } catch (error) {
        navigationStartedRef.current = false;
        setMessage((error as Error).message);
      }
    }
    void enterEpisode();
  }, [job, reducedMotion, router, setExperiencePhase]);

  async function repairDraft() {
    if (!jobId) return;
    setRepairing(true);
    setMessage("");
    try {
      const response = await fetch(`/api/jobs/${encodeURIComponent(jobId)}/repair`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? "The saved draft could not be repaired.");
      setJob(data);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setRepairing(false);
    }
  }

  async function retryGeneration() {
    if (!job) return;
    setRetrying(true);
    setMessage("");
    try {
      const response = await fetch("/api/episodes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sourceInput: job.sourceInput,
          subject: job.subject,
          level: job.level,
          genre: job.genre,
          language: job.language,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? "A new generation job could not be started.");
      router.replace(`/generate?jobId=${encodeURIComponent(data.jobId)}`);
    } catch (error) {
      setMessage((error as Error).message);
      setRetrying(false);
    }
  }

  if (!jobId) return <PipelineFailure message="No generation job was supplied." />;

  const activeStage = job?.stageIndex ?? 0;
  const ready = job?.status === "complete";
  const failed = job?.status === "error";

  return (
    <section className={`director-pipeline ${ready ? "is-ready" : ""} ${failed ? "is-failed" : ""}`} aria-live="polite">
      <header className="director-pipeline__header">
        <Link href="/" className="director-pipeline__brand">AHA</Link>
        <span>EPISODE 01 · DIRECTOR PIPELINE</span>
      </header>

      <div className="director-pipeline__copy">
        <p className="forge-eyebrow">DIRECTOR PIPELINE · LIVE</p>
        <h1>{ready ? "Episode locked." : failed ? "The signal needs attention." : "Turning knowledge into consequence."}</h1>
        <p>{ready ? "Opening the first scene now." : failed ? "Your source is safe. Resolve the connection, then continue." : "Story, evidence, and diagnostic choices are being composed as one playable system."}</p>
      </div>

      <div className="director-reactor" aria-hidden="true">
        <span className="director-reactor__halo" />
        <span className="director-reactor__core" />
        <span className="director-reactor__scan" />
      </div>

      <ol className="director-stages" aria-label="Episode generation progress">
        {DIRECTOR_STAGES.map((stage, index) => {
          const complete = ready || index < activeStage;
          const active = !failed && !ready && index === activeStage;
          return (
            <li key={stage} className={complete ? "is-complete" : active ? "is-active" : failed && index === activeStage ? "is-failed" : ""}>
              <span>{complete ? "✓" : String(index + 1).padStart(2, "0")}</span>
              <strong>{stage}</strong>
              <small>{complete ? "LOCKED" : active ? "IN PROCESS" : failed && index === activeStage ? "INTERRUPTED" : "STANDBY"}</small>
            </li>
          );
        })}
      </ol>

      <div className="director-pipeline__status">
        <div className="director-progress"><span style={{ width: `${job?.progress ?? 4}%` }} /></div>
        <div><strong>{String(Math.round(job?.progress ?? 4)).padStart(3, "0")}%</strong><span>{elapsed > 45_000 && !ready && !failed ? "Still directing — complex sources can take a little longer." : ready ? "EPISODE LOCKED" : "SYSTEMS SYNCHRONIZED"}</span></div>
      </div>

      {failed ? (
        <div className="director-error" role="alert">
          <strong>{generationErrorHeading(job.error?.code)}</strong>
          <p>{job.error?.message}</p>
          {message ? <p>{message}</p> : null}
          <div>
            {job.error?.code === "EPISODE_VALIDATION_FAILED" && job.draftId ? (
              <button type="button" onClick={repairDraft} disabled={repairing}>{repairing ? "REPAIRING DRAFT…" : "REPAIR SAVED DRAFT"}</button>
            ) : isTransientGenerationError(job.error?.code) ? (
              <button type="button" onClick={retryGeneration} disabled={retrying}>{retrying ? "RESTARTING…" : "TRY AGAIN"}</button>
            ) : null}
            <Link href="/create">EDIT SOURCE</Link>
          </div>
        </div>
      ) : message ? <p className="director-network-note" role="status">{message} Reconnecting…</p> : null}
    </section>
  );
}

function generationErrorHeading(code?: string) {
  switch (code) {
    case "OPENAI_QUOTA_EXHAUSTED": return "The API project needs available quota.";
    case "OPENAI_RATE_LIMITED": return "The director is at capacity.";
    case "OPENAI_AUTH_FAILED":
    case "OPENAI_API_KEY_REQUIRED": return "The model connection needs attention.";
    case "OPENAI_MODEL_ACCESS_DENIED": return "This project cannot access the selected model.";
    case "EPISODE_VALIDATION_FAILED": return "This draft did not pass the teaching gate.";
    default: return "Generation paused before publication.";
  }
}

function PipelineFailure({ message }: { message: string }) {
  return <div className="director-error director-error--standalone" role="alert"><strong>We lost the generation job.</strong><p>{message}</p><Link href="/create">RETURN TO SOURCE</Link></div>;
}
