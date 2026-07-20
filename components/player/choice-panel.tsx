"use client";

import { useEffect, useRef, useState } from "react";
import type { Confidence, EpisodeSpec } from "@/lib/episode/schema";

export function ChoicePanel({ node, checkpoint, onCommit, busy }: {
  node: EpisodeSpec["choiceNodes"][number];
  checkpoint: number;
  onCommit: (optionId: string, confidence: Confidence) => void;
  busy: boolean;
}) {
  const [optionId, setOptionId] = useState("");
  const [step, setStep] = useState<"choice" | "confidence">("choice");
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => headingRef.current?.focus(), []);

  return (
    <div className="decision-overlay" role="dialog" aria-modal="true" aria-labelledby={`prompt-${node.id}`}>
      <div className="decision-overlay__signal"><span>DIAGNOSTIC INTERRUPTION</span><i /></div>
      <div className="decision-overlay__content">
        <p>DECISION {checkpoint} / 2</p>
        <h2 id={`prompt-${node.id}`} ref={headingRef} tabIndex={-1}>
          {step === "choice" ? node.prompt : "How certain is that call?"}
        </h2>
        <small>{step === "choice" ? "The story will react. The director is listening for your mental model." : "Confidence changes how the next idea is represented."}</small>

        {step === "choice" ? (
          <div className="decision-options">
            {node.options.map((option, index) => (
              <button key={option.id} type="button" onClick={() => { setOptionId(option.id); setStep("confidence"); }}>
                <span>{String.fromCharCode(65 + index)}</span><strong>{option.label}</strong><i>SELECT</i>
              </button>
            ))}
          </div>
        ) : (
          <div className="confidence-options">
            {(["guessing", "somewhat_sure", "very_sure"] as const).map((confidence) => (
              <button key={confidence} type="button" disabled={busy} onClick={() => onCommit(optionId, confidence)}>
                <span>{confidence === "guessing" ? "01" : confidence === "somewhat_sure" ? "02" : "03"}</span>
                {confidence.replace("_", " ")}
              </button>
            ))}
            <button className="decision-back" type="button" disabled={busy} onClick={() => setStep("choice")}>CHANGE DECISION</button>
          </div>
        )}
      </div>
      {busy ? <div className="decision-directing" role="status"><span />DIRECTOR RECALIBRATING</div> : null}
    </div>
  );
}
