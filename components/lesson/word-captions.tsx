"use client";

import { useEffect, useState } from "react";
import type { WordTiming } from "@/lib/media/alignment";
import type { WhiteboardClock } from "@/components/lesson/whiteboard-stage";

type WordCaptionsProps = {
  narration: string;
  transcript: string;
  timings: WordTiming[] | null;
  clockRef: WhiteboardClock;
  playing: boolean;
};

/**
 * Karaoke captions: when word timings exist the narration text is shown with
 * the currently spoken word highlighted; otherwise the written transcript is
 * shown as static text (the existing captions behavior).
 */
export function WordCaptions({ narration, transcript, timings, clockRef, playing }: WordCaptionsProps) {
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    if (!timings || timings.length === 0) return;
    let frame = 0;
    let lastIndex = -1;
    const tick = () => {
      const ms = clockRef.current.ms;
      let index = -1;
      for (let cursor = 0; cursor < timings.length; cursor += 1) {
        if (timings[cursor].startMs <= ms) index = cursor;
        else break;
      }
      if (index !== lastIndex) { lastIndex = index; setActiveIndex(index); }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [timings, clockRef, playing]);

  if (!timings || timings.length === 0) return <p>{transcript}</p>;

  // Rebuild the narration from its own words so highlight indexes line up
  // with the audio alignment even when narration and transcript differ.
  const words = narration.split(/\s+/).filter(Boolean);
  return (
    <p className="word-captions">
      {words.map((word, index) => (
        <span key={`${index}-${word}`} className={index === activeIndex ? "word-captions__word is-active" : "word-captions__word"}>
          {word}{" "}
        </span>
      ))}
    </p>
  );
}
