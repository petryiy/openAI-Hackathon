"use client";

import { motion } from "motion/react";
import { type PointerEvent, useRef } from "react";
import { TechMarquee } from "@/components/onboarding/tech-marquee";
import { useOnboarding } from "@/components/onboarding/onboarding-shell";

const portalNodes = [
  { label: "STORY", index: "01", className: "portal-node--story" },
  { label: "VISUALIZE", index: "02", className: "portal-node--visualize" },
  { label: "CHOOSE", index: "03", className: "portal-node--choose" },
  { label: "ADAPT", index: "04", className: "portal-node--adapt" },
];

export function LandingPage() {
  const { phase, startJourney, reducedMotion } = useOnboarding();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const entering = phase === "entering";

  function moveButton(event: PointerEvent<HTMLButtonElement>) {
    if (reducedMotion || entering) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left - bounds.width / 2) * 0.12;
    const y = (event.clientY - bounds.top - bounds.height / 2) * 0.16;
    buttonRef.current?.style.setProperty("--magnet-x", `${x}px`);
    buttonRef.current?.style.setProperty("--magnet-y", `${y}px`);
  }

  function resetButton() {
    buttonRef.current?.style.setProperty("--magnet-x", "0px");
    buttonRef.current?.style.setProperty("--magnet-y", "0px");
  }

  return (
    <motion.main
      className="onboarding-landing"
      initial={reducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.55 }}
    >
      <header className="landing-header">
        <div className="onboarding-brand" aria-label="Aha">
          <span className="onboarding-brand__mark" aria-hidden="true"><i /></span>
          <span>Aha</span>
        </div>
        <div className="landing-header__meta">
          <span className="landing-header__signal" aria-hidden="true" />
          Learning engine online
        </div>
      </header>

      <div className="landing-layout">
        <motion.section
          className="landing-copy"
          animate={entering
            ? { opacity: 0, x: -28, scale: 0.975 }
            : { opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: reducedMotion ? 0.12 : 0.3, delay: entering ? 0.08 : 0 }}
        >
          <p className="landing-eyebrow"><span>00</span> Adaptive visual learning</p>
          <h1>
            <span>Don’t just learn it.</span>
            <strong>Step inside it.</strong>
          </h1>
          <p className="landing-description">
            Turn any STEM question into a visual lesson that adapts when your reasoning changes.
          </p>

          <div className="landing-action-row">
            <button
              ref={buttonRef} className="landing-cta" type="button" data-cursor="active"
              disabled={entering} onClick={startJourney} onPointerMove={moveButton}
              onPointerLeave={resetButton}
            >
              <span className="landing-cta__label">{entering ? "Opening the lab" : "Start a lesson"}</span>
              <span className="landing-cta__icon" aria-hidden="true"><i /><b>↗</b></span>
            </button>
          </div>

          <TechMarquee />
        </motion.section>

        <div className="portal-interface-anchor">
          <motion.section
            className="portal-interface"
            aria-label="The learning loop: story, visualize, choose, and adapt"
            animate={entering ? { opacity: 0.05, scale: 1.08 } : { opacity: 1, scale: 1 }}
            transition={{ duration: reducedMotion ? 0.12 : 0.62, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="portal-interface__bracket portal-interface__bracket--top" aria-hidden="true" />
            <div className="portal-interface__bracket portal-interface__bracket--bottom" aria-hidden="true" />
            {portalNodes.map((node) => (
              <div className={`portal-node ${node.className}`} key={node.label}>
                <span>{node.index}</span><strong>{node.label}</strong>
              </div>
            ))}
            <div className="portal-readout" aria-hidden="true">
              <span>KNOWLEDGE CORE</span><strong>{entering ? "ENTERING" : "ONLINE"}</strong>
            </div>
            <div className="portal-coordinate portal-coordinate--left" aria-hidden="true">X 42.7 / Y 19.4</div>
            <div className="portal-coordinate portal-coordinate--right" aria-hidden="true">MODEL / PLOT–01</div>
          </motion.section>
        </div>
      </div>

      <div className="landing-edge-copy" aria-hidden="true">
        <span>STORY CREATES THE STAKES</span>
        <span>VISUALS REVEAL THE RULE</span>
      </div>
    </motion.main>
  );
}
