"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useSyncExternalStore } from "react";

const LiquidEther = dynamic(
  () => import("@/components/onboarding/liquid-ether").then((m) => ({ default: m.LiquidEther })),
  { ssr: false },
);

const FINE_POINTER_QUERY = "(pointer: fine)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const TRAIL_COLORS = ["#5ad7ff", "#78f3ff", "#8a6cff"];

function subscribePointerPreferences(onChange: () => void) {
  const finePointer = window.matchMedia(FINE_POINTER_QUERY);
  const reducedMotion = window.matchMedia(REDUCED_MOTION_QUERY);
  finePointer.addEventListener("change", onChange);
  reducedMotion.addEventListener("change", onChange);
  return () => {
    finePointer.removeEventListener("change", onChange);
    reducedMotion.removeEventListener("change", onChange);
  };
}

function readPointerPreferences() {
  return (
    window.matchMedia(FINE_POINTER_QUERY).matches &&
    !window.matchMedia(REDUCED_MOTION_QUERY).matches
  );
}

export function CustomCursor({
  variant = "landing",
  suspended = false,
}: {
  variant?: "landing" | "create" | "compiling";
  suspended?: boolean;
}) {
  const dotRef = useRef<HTMLSpanElement>(null);
  const ringRef = useRef<HTMLSpanElement>(null);
  const glowRef = useRef<HTMLSpanElement>(null);
  const enabled = useSyncExternalStore(
    subscribePointerPreferences,
    readPointerPreferences,
    () => false,
  );

  useEffect(() => {
    if (!enabled) return;

    document.documentElement.classList.add("landing-cursor-enabled");
    const shell = document.querySelector<HTMLElement>(".onboarding-shell");
    let frame = 0;
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let ringX = targetX;
    let ringY = targetY;
    let active = false;
    let hidden = false;

    const move = (event: PointerEvent) => {
      targetX = event.clientX;
      targetY = event.clientY;
      const target = event.target as Element | null;
      active = Boolean(target?.closest?.("[data-cursor='active']"));
      hidden = Boolean(target?.closest?.("textarea, input, select, [contenteditable='true']"));
      const violet = Boolean(target?.closest?.("[data-cursor-color='violet']"));
      shell?.style.setProperty("--cursor-x", `${targetX}px`);
      shell?.style.setProperty("--cursor-y", `${targetY}px`);
      shell?.style.setProperty("--cursor-accent", violet ? "#a687ff" : "#78f3ff");
      dotRef.current?.style.setProperty("transform", `translate3d(${targetX}px, ${targetY}px, 0)`);
      glowRef.current?.style.setProperty("transform", `translate3d(${targetX}px, ${targetY}px, 0)`);
      dotRef.current?.style.setProperty("opacity", hidden ? "0" : "1");
      ringRef.current?.style.setProperty("opacity", hidden ? "0" : "1");
      glowRef.current?.style.setProperty("opacity", hidden ? "0" : "1");
    };

    const render = () => {
      ringX += (targetX - ringX) * 0.16;
      ringY += (targetY - ringY) * 0.16;
      ringRef.current?.style.setProperty(
        "transform",
        `translate3d(${ringX}px, ${ringY}px, 0) scale(${active ? 1.65 : 1})`,
      );
      frame = requestAnimationFrame(render);
    };

    window.addEventListener("pointermove", move, { passive: true });
    frame = requestAnimationFrame(render);
    return () => {
      document.documentElement.classList.remove("landing-cursor-enabled");
      shell?.style.removeProperty("--cursor-x");
      shell?.style.removeProperty("--cursor-y");
      shell?.style.removeProperty("--cursor-accent");
      window.removeEventListener("pointermove", move);
      cancelAnimationFrame(frame);
    };
  }, [enabled]);

  return (
    <>
      {enabled ? (
        <div
          className="landing-fluid-trail"
          data-variant={variant}
          data-suspended={suspended}
          aria-hidden="true"
        >
          <LiquidEther
            colors={TRAIL_COLORS}
            resolution={0.3}
            autoDemo
            autoSpeed={0.3}
            autoIntensity={1.2}
            mouseForce={12}
            cursorSize={64}
            autoResumeDelay={500}
            autoRampDuration={0.8}
            paused={suspended}
          />
        </div>
      ) : null}
      <div className="landing-cursor" data-variant={variant} aria-hidden="true">
        <span ref={glowRef} className="landing-cursor__glow" />
        <span ref={ringRef} className="landing-cursor__ring" />
        <span ref={dotRef} className="landing-cursor__dot" />
      </div>
    </>
  );
}
