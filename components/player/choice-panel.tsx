"use client";

import { useState } from "react";
import type { Confidence, EpisodeSpec } from "@/lib/episode/schema";

export function ChoicePanel({
  node,
  checkpoint,
  onCommit,
  busy,
}: {
  node: EpisodeSpec["choiceNodes"][number];
  checkpoint: number;
  onCommit: (optionId: string, confidence: Confidence) => void;
  busy: boolean;
}) {
  const [optionId, setOptionId] = useState("");
  const [confidence, setConfidence] = useState<Confidence | "">("");

  return (
    <div className="choice-dock" role="dialog" aria-labelledby={`prompt-${node.id}`}>
      <div className="choice-dock__heading">
        <span>Decision {checkpoint} / 2</span>
        <h2 id={`prompt-${node.id}`}>{node.prompt}</h2>
        <small>Your action changes both the launch and the next explanation.</small>
      </div>
      <div className="choice-options">
        {node.options.map((option, index) => (
          <button
            key={option.id}
            type="button"
            className={optionId === option.id ? "is-selected" : ""}
            aria-pressed={optionId === option.id}
            onClick={() => setOptionId(option.id)}
          >
            <span>{String.fromCharCode(65 + index)}</span>
            {option.label}
          </button>
        ))}
      </div>
      <div className="confidence-row">
        <span>How sure are you?</span>
        {([
          ["guessing", "Guessing"],
          ["somewhat_sure", "Somewhat sure"],
          ["very_sure", "Very sure"],
        ] as const).map(([value, label]) => (
          <button key={value} type="button" aria-pressed={confidence === value} onClick={() => setConfidence(value)}>{label}</button>
        ))}
        <button className="commit-choice" type="button" disabled={!optionId || !confidence || busy} onClick={() => onCommit(optionId, confidence as Confidence)}>
          {busy ? "Director deciding…" : "Commit action →"}
        </button>
      </div>
    </div>
  );
}
