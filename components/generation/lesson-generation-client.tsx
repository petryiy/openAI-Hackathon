"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useOnboarding } from "@/components/onboarding/onboarding-shell";
import { LESSON_PIPELINE_STAGES, type LessonJob } from "@/lib/lesson/jobs";

const POLL_INTERVAL_MS = 500;

export function LessonGenerationClient({ jobId }: { jobId: string }) {
  const router = useRouter();
  const { reducedMotion, setExperiencePhase } = useOnboarding();
  const [job, setJob] = useState<LessonJob | null>(null);
  const [message, setMessage] = useState("");
  const [retrying, setRetrying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startedAtRef = useRef(0);
  const navigationStartedRef = useRef(false);

  const readJob = useCallback(async () => {
    const response = await fetch(`/api/lesson-jobs/${encodeURIComponent(jobId)}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message ?? "The lesson job is temporarily unavailable.");
    setMessage("");
    setJob(data as LessonJob);
    return data as LessonJob;
  }, [jobId]);

  useEffect(() => {
    setExperiencePhase("compiling");
    return () => setExperiencePhase("create");
  }, [setExperiencePhase]);

  useEffect(() => {
    startedAtRef.current = Date.now();
    navigationStartedRef.current = false;
    let stopped = false;
    let timer = 0;

    async function observe() {
      try {
        const latest = await readJob();
        if (!stopped && latest.status === "processing") {
          timer = window.setTimeout(observe, POLL_INTERVAL_MS);
        }
      } catch (error) {
        if (!stopped) {
          setMessage((error as Error).message);
          timer = window.setTimeout(observe, 2_000);
        }
      }
    }

    void observe();
    return () => {
      stopped = true;
      window.clearTimeout(timer);
    };
  }, [readJob]);

  useEffect(() => {
    const timer = window.setInterval(() => setElapsed(Date.now() - startedAtRef.current), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (job?.status !== "complete" || !job.lessonId || navigationStartedRef.current) return;
    navigationStartedRef.current = true;
    const destination = `/lesson/${encodeURIComponent(job.lessonId)}`;
    router.prefetch(destination);
    setExperiencePhase("episode-ready");
    const timer = window.setTimeout(() => router.replace(destination), reducedMotion ? 180 : 900);
    return () => window.clearTimeout(timer);
  }, [job, reducedMotion, router, setExperiencePhase]);

  async function retryGeneration() {
    if (!job) return;
    setRetrying(true);
    setMessage("");
    try {
      const response = await fetch("/api/lessons", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sourceInput: job.sourceInput, locale: job.locale, level: job.level }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? "A new lesson job could not be started.");
      router.replace(`/generate?lessonJobId=${encodeURIComponent(data.jobId)}`);
    } catch (error) {
      setMessage((error as Error).message);
      setRetrying(false);
    }
  }

  const activeStage = job?.stageIndex ?? 0;
  const ready = job?.status === "complete";
  const failed = job?.status === "error";

  return (
    <section className={`director-pipeline ${ready ? "is-ready" : ""} ${failed ? "is-failed" : ""}`} aria-live="polite">
      <header className="director-pipeline__header">
        <Link href="/" className="director-pipeline__brand">PLOT AS PROOF</Link>
        <span>CALCULUS LESSON · VISUAL PIPELINE</span>
      </header>

      <div className="director-pipeline__copy">
        <p className="forge-eyebrow">VISUAL LESSON PIPELINE · LIVE</p>
        <h1>{ready ? "Lesson locked." : failed ? "The signal needs attention." : "Building the explanation."}</h1>
        <p>{ready
          ? "Opening the first visual chapter now."
          : failed
            ? "Your question is safe. Retry the job or return to edit it."
            : "Verified mathematics, narration, and deterministic visuals are being assembled into one guided lesson."}</p>
      </div>

      <div className="director-reactor" aria-hidden="true">
        <span className="director-reactor__halo" />
        <span className="director-reactor__core" />
        <span className="director-reactor__scan" />
      </div>

      <ol className="director-stages" aria-label="Visual lesson generation progress">
        {LESSON_PIPELINE_STAGES.map((stage, index) => {
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
        <div>
          <strong>{String(Math.round(job?.progress ?? 4)).padStart(3, "0")}%</strong>
          <span>{elapsed > 45_000 && !ready && !failed ? "Still composing — visual rendering can take a little longer." : ready ? "LESSON LOCKED" : "SYSTEMS SYNCHRONIZED"}</span>
        </div>
      </div>

      {failed ? (
        <div className="director-error" role="alert">
          <strong>Lesson generation paused.</strong>
          <p>{job.error?.message}</p>
          {message ? <p>{message}</p> : null}
          <div>
            {job.error?.recoverable ? <button type="button" onClick={retryGeneration} disabled={retrying}>{retrying ? "RESTARTING…" : "TRY AGAIN"}</button> : null}
            <Link href="/create">EDIT QUESTION</Link>
          </div>
        </div>
      ) : message ? <p className="director-network-note" role="status">{message} Reconnecting…</p> : null}
    </section>
  );
}
