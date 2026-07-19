"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useSyncExternalStore } from "react";

const LiquidEther = dynamic(
  () => import("@/components/onboarding/liquid-ether").then((m) => ({ default: m.LiquidEther })),
  { ssr: false },
);

const FINE_POINTER_QUERY = "(pointer: fine)";
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

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

export function CustomCursor() {
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

    const move = (event: PointerEvent) => {
      targetX = event.clientX;
      targetY = event.clientY;
      active = Boolean((event.target as Element | null)?.closest?.("[data-cursor='active']"));
      shell?.style.setProperty("--cursor-x", `${targetX}px`);
      shell?.style.setProperty("--cursor-y", `${targetY}px`);
      dotRef.current?.style.setProperty("transform", `translate3d(${targetX}px, ${targetY}px, 0)`);
      glowRef.current?.style.setProperty("transform", `translate3d(${targetX}px, ${targetY}px, 0)`);
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
      window.removeEventListener("pointermove", move);
      cancelAnimationFrame(frame);
    };
  }, [enabled]);

  return (
    <>
      {enabled ? (
        <div className="landing-fluid-trail" aria-hidden="true">
          <LiquidEther
            colors={["#5ad7ff", "#78f3ff", "#8a6cff"]}
            resolution={0.35}
            autoDemo={true}
            autoSpeed={0.3}
            autoIntensity={1.5}
            mouseForce={15}
            cursorSize={80}
            autoResumeDelay={500}
            autoRampDuration={0.8}
          />
        </div>
      ) : null}
      <div className="landing-cursor" aria-hidden="true">
        <span ref={glowRef} className="landing-cursor__glow" />
        <span ref={ringRef} className="landing-cursor__ring" />
        <span ref={dotRef} className="landing-cursor__dot" />
      </div>
    </>
  );
}
