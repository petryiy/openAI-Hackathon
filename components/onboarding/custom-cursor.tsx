"use client";

import { useEffect, useRef } from "react";
import { FluidTrail } from "@/components/onboarding/fluid-trail";

export function CustomCursor() {
  const dotRef = useRef<HTMLSpanElement>(null);
  const ringRef = useRef<HTMLSpanElement>(null);
  const glowRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const finePointer = window.matchMedia("(pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!finePointer.matches || reducedMotion.matches) return;

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
  }, []);

  return (
    <>
      <FluidTrail />
      <div className="landing-cursor" aria-hidden="true">
        <span ref={glowRef} className="landing-cursor__glow" />
        <span ref={ringRef} className="landing-cursor__ring" />
        <span ref={dotRef} className="landing-cursor__dot" />
      </div>
    </>
  );
}
