"use client";

import { type PointerEvent, useEffect, useRef } from "react";

export function MissionWindow({ launching = false }: { launching?: boolean }) {
  const frameRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
  }, []);

  function moveLight(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse") return;
    const scene = event.currentTarget;
    const bounds = scene.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;

    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    frameRef.current = window.requestAnimationFrame(() => {
      scene.style.setProperty("--scene-x", `${Math.round(x * 100)}%`);
      scene.style.setProperty("--scene-y", `${Math.round(y * 100)}%`);
      scene.style.setProperty("--scene-shift-x", `${((x - 0.5) * 12).toFixed(2)}px`);
      scene.style.setProperty("--scene-shift-y", `${((y - 0.5) * 8).toFixed(2)}px`);
    });
  }

  function resetLight(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.style.setProperty("--scene-x", "68%");
    event.currentTarget.style.setProperty("--scene-y", "32%");
    event.currentTarget.style.setProperty("--scene-shift-x", "0px");
    event.currentTarget.style.setProperty("--scene-shift-y", "0px");
  }

  return (
    <div
      className={`mission-window ${launching ? "is-launching" : ""}`}
      onPointerMove={moveLight}
      onPointerLeave={resetLight}
      role="img"
      aria-label="A capsule trajectory crossing a lunar crater from the Moonbase Last Shot episode"
    >
      <div className="mission-window__glow" aria-hidden="true" />
      <div className="mission-window__stars mission-window__stars--far" aria-hidden="true" />
      <div className="mission-window__stars mission-window__stars--near" aria-hidden="true" />
      <div className="mission-window__hud" aria-hidden="true">
        <span>LIVE SIMULATION</span>
        <span><i /> CORRIDOR OPEN · 02:30</span>
      </div>
      <div className="mission-window__target" aria-hidden="true"><i /><span>MED BAY</span></div>
      <svg className="mission-window__trajectory" viewBox="0 0 720 250" aria-hidden="true">
        <defs>
          <filter id="home-trajectory-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <path className="mission-path-guide" d="M78 186 C230 40 480 48 646 181" />
        <path className="mission-path" d="M78 186 C230 40 480 48 646 181" filter="url(#home-trajectory-glow)" />
        <g className="mission-capsule">
          <path d="M-18 -7 H10 Q21 0 10 7 H-18 Q-24 0 -18 -7Z" />
          <path d="M-16 -7 L-24 -15 M-16 7 L-24 15" />
          <circle cx="6" cy="0" r="3" />
        </g>
        <g className="mission-vector mission-vector--x">
          <path d="M90 184 H178" /><path d="M178 184 l-10 -6 v12Z" />
          <text x="124" y="174">2× Vₓ</text>
        </g>
        <g className="mission-vector mission-vector--y">
          <path d="M354 79 V142" /><path d="M354 142 l-6 -10 h12Z" />
          <text x="365" y="117">g</text>
        </g>
      </svg>
      <div className="mission-window__terrain" aria-hidden="true">
        <span className="mission-crater mission-crater--one" />
        <span className="mission-crater mission-crater--two" />
        <span className="mission-window__dust" />
      </div>
      <div className="mission-window__readout" aria-hidden="true">
        <span><small>LANDING TIME</small><strong>UNCHANGED</strong></span>
        <span><small>HORIZONTAL RANGE</small><strong>2.00 ×</strong></span>
      </div>
      <div className="mission-window__scan" aria-hidden="true" />
    </div>
  );
}
