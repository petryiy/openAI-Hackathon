"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

let bootHasPlayed = false;

type BootSequenceProps = {
  ready: boolean;
  reducedMotion: boolean;
};

export function BootSequence({ ready, reducedMotion }: BootSequenceProps) {
  const [visible, setVisible] = useState(!bootHasPlayed);
  const [minimumElapsed, setMinimumElapsed] = useState(false);

  useEffect(() => {
    if (bootHasPlayed) return;
    const minimum = window.setTimeout(
      () => setMinimumElapsed(true),
      reducedMotion ? 100 : 480,
    );
    const safety = window.setTimeout(() => {
      bootHasPlayed = true;
      setVisible(false);
    }, 2200);
    return () => {
      window.clearTimeout(minimum);
      window.clearTimeout(safety);
    };
  }, [reducedMotion]);

  useEffect(() => {
    if (!visible || !ready || !minimumElapsed) return;
    bootHasPlayed = true;
    const frame = requestAnimationFrame(() => setVisible(false));
    return () => cancelAnimationFrame(frame);
  }, [minimumElapsed, ready, visible]);

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          className="portal-boot"
          role="status"
          aria-label="Loading the interactive knowledge space"
          initial={{ opacity: 1 }}
          exit={reducedMotion
            ? { opacity: 0 }
            : { opacity: 0, scale: 1.035, filter: "blur(10px)" }}
          transition={{ duration: reducedMotion ? 0.12 : 0.38, ease: [0.55, 0, 1, 0.45] }}
        >
          <div className="portal-boot__scan" aria-hidden="true" />
          <div className="portal-boot__system" aria-hidden="true">
            <span className="portal-boot__orbit portal-boot__orbit--one" />
            <span className="portal-boot__orbit portal-boot__orbit--two" />
            <span className="portal-boot__orbit portal-boot__orbit--three" />
            <span className="portal-boot__core" />
          </div>
          <div className="portal-boot__copy">
            <strong>AHA</strong>
            <span>{ready ? "KNOWLEDGE SPACE SYNCHRONIZED" : "CALIBRATING KNOWLEDGE SPACE"}</span>
          </div>
          <div className="portal-boot__progress" aria-hidden="true"><i /></div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
