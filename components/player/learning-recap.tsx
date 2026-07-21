import Link from "next/link";
import type { EpisodeSpec, LearnerState, StoryState } from "@/lib/episode/schema";

type TransferResult = {
  correct: boolean;
  explanation: string;
  learnerState: LearnerState;
  recap: { headline: string; strongConcepts: string[]; practiceConcepts: string[]; note: string };
};

export function LearningRecap({
  episode,
  storyState,
  result,
  onReplay,
}: {
  episode: EpisodeSpec;
  storyState: StoryState;
  result: TransferResult;
  onReplay: () => void;
}) {
  return (
    <main className="recap-shell">
      <header className="recap-header"><div className="brand"><span className="brand-mark">A<span>↗</span></span><span><strong>Aha</strong><small>Learning recap</small></span></div><span>Episode complete · 03:02</span></header>
      <section className="recap-hero">
        <div className={`transfer-result-mark ${result.correct ? "is-correct" : ""}`}>{result.correct ? "✓" : "↻"}</div>
        <p className="eyebrow">Transfer evidence</p>
        <h1>{result.recap.headline}</h1>
        <p>{result.explanation}</p>
      </section>
      <section className="recap-grid">
        <article className="path-card">
          <div className="section-heading"><div><small>Your path</small><h2>What changed the teaching</h2></div><span>2 decisions</span></div>
          {episode.choiceNodes.map((node, index) => {
            const optionId = storyState.flags[`${node.id}:option`] as string | undefined;
            const option = node.options.find((item) => item.id === optionId);
            const confidence = storyState.flags[`${node.id}:confidence`] as string | undefined;
            const strategy = storyState.flags[`${node.id}:strategy`] as string | undefined;
            return <div className="path-row" key={node.id}><span>{index + 1}</span><div><small>{option?.label ?? "No answer recorded"}</small><p>{confidence?.replace("_", " ")} confidence</p></div><strong className={`strategy strategy-${strategy}`}>{strategy}</strong></div>;
          })}
          <div className="path-row transfer-row"><span>→</span><div><small>Unassisted transfer</small><p>New context · no hints</p></div><strong>{result.correct ? "correct" : "review"}</strong></div>
        </article>
        <article className="evidence-card">
          <div className="section-heading"><div><small>Learning hypothesis</small><h2>Current evidence</h2></div><span>Not a grade</span></div>
          {episode.concepts.map((concept) => {
            const score = result.learnerState.conceptScores[concept.id] ?? 0;
            return <div className="concept-evidence" key={concept.id}><div><strong>{concept.name}</strong><span>{Math.round(score * 100)} evidence</span></div><div className="evidence-bar"><span style={{ width: `${score * 100}%` }} /></div><p>{concept.relationship}</p></div>;
          })}
          {result.learnerState.possibleMisconceptions.length ? <div className="misconception-note"><strong>Worth checking again</strong><p>{result.learnerState.possibleMisconceptions.at(-1)}</p></div> : null}
          <p className="caution-note">{result.recap.note}</p>
        </article>
      </section>
      <div className="recap-actions"><button className="primary-button" onClick={onReplay}>Replay with a different path ↻</button><Link className="text-button" href="/">Create another episode</Link></div>
    </main>
  );
}

export type { TransferResult };
