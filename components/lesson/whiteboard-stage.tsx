"use client";

import { gsap } from "gsap";
import katex from "katex";
import { useLayoutEffect, useMemo, useRef, type MutableRefObject } from "react";
import { WHITEBOARD_COLORS, type WhiteboardElement } from "@/lib/lesson/whiteboard-dsl";
import type { GenericSegment } from "@/lib/lesson/schema";
import type { NarrationAlignment } from "@/lib/media/alignment";
import { compileTimeline, initiallyHiddenElementIds } from "@/lib/player/whiteboard-timeline";
import { layoutScene, PLOT_AREA, type SceneLayout } from "@/lib/player/whiteboard-layout";

export type WhiteboardClock = MutableRefObject<{ ms: number }>;

type StageProps = {
  segment: GenericSegment;
  alignment: NarrationAlignment | null;
  durationMs: number;
  clockRef: WhiteboardClock;
  reducedMotion: boolean;
};

const TEXT_SIZES = { sm: 15, md: 22, lg: 30 } as const;

function elementCenter(element: WhiteboardElement, layout: SceneLayout): { x: number; y: number } | null {
  if (element.type === "text" || element.type === "formula") {
    const placed = layout.textPlacements.get(element.id);
    return placed ? { x: placed.x, y: placed.y } : null;
  }
  if (element.type === "point") {
    return layout.mapper ? { x: layout.mapper.toScreenX(element.x), y: layout.mapper.toScreenY(element.y) } : null;
  }
  if (element.type === "plot") return layout.plotPlacements.get(element.id)?.markPoint ?? null;
  if (element.type === "mathline") {
    if (!layout.mapper) return null;
    return {
      x: (layout.mapper.toScreenX(element.x1) + layout.mapper.toScreenX(element.x2)) / 2,
      y: (layout.mapper.toScreenY(element.y1) + layout.mapper.toScreenY(element.y2)) / 2,
    };
  }
  if (element.type === "line" || element.type === "arrow") return { x: (element.x1 + element.x2) / 2, y: (element.y1 + element.y2) / 2 };
  if (element.type === "rect") return { x: element.x + element.width / 2, y: element.y + element.height / 2 };
  if (element.type === "circle") return { x: element.cx, y: element.cy };
  return null;
}

function labelOffset(placement: "above" | "below" | "left" | "right"): { dx: number; dy: number; anchor: "start" | "middle" | "end" } {
  if (placement === "above") return { dx: 0, dy: -26, anchor: "middle" };
  if (placement === "below") return { dx: 0, dy: 34, anchor: "middle" };
  if (placement === "left") return { dx: -14, dy: 5, anchor: "end" };
  return { dx: 14, dy: 5, anchor: "start" };
}

function arrowHead(x1: number, y1: number, x2: number, y2: number): string {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const size = 12;
  const back = (spread: number) => `${x2 - size * Math.cos(angle - spread)},${y2 - size * Math.sin(angle - spread)}`;
  return `${x2},${y2} ${back(0.42)} ${back(-0.42)}`;
}

export function WhiteboardStage({ segment, alignment, durationMs, clockRef, reducedMotion }: StageProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const elementRefs = useRef(new Map<string, Element>());
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const layout = useMemo(() => layoutScene(segment.scene), [segment.scene]);

  /* These curried callbacks are only ever passed to ref=, so React runs them at commit time; the map is never touched during render. */
  /* eslint-disable react-hooks/refs */
  const setElementRef = (id: string) => (node: Element | null) => {
    if (node) elementRefs.current.set(id, node);
    else elementRefs.current.delete(id);
  };
  /* eslint-enable react-hooks/refs */

  useLayoutEffect(() => {
    const cues = compileTimeline(segment.scene, segment.narration, alignment, durationMs);
    const hidden = initiallyHiddenElementIds(segment.scene);
    const refs = elementRefs.current;
    const timeline = gsap.timeline({ paused: true });

    for (const element of segment.scene.elements) {
      const node = refs.get(element.id);
      if (!node) continue;
      gsap.set(node, hidden.has(element.id) ? { autoAlpha: 0 } : { autoAlpha: 1 });
    }

    for (const cue of cues) {
      const node = refs.get(cue.action.targetId);
      if (!node) continue;
      const at = cue.startMs / 1_000;
      const duration = cue.durationMs / 1_000;
      const op = cue.action.op;
      if (op === "appear") {
        timeline.to(node, { autoAlpha: 1, duration }, at);
      } else if (op === "write") {
        if (node instanceof HTMLElement) {
          timeline.set(node, { autoAlpha: 1, clipPath: "inset(0 100% 0 0)" }, at);
          timeline.to(node, { clipPath: "inset(0 0% 0 0)", duration }, at);
        } else {
          timeline.fromTo(node, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration }, at);
        }
      } else if (op === "draw") {
        const shape = node as SVGGeometryElement;
        let length = 0;
        try { length = shape.getTotalLength(); } catch { /* not a measurable shape */ }
        if (length > 0) {
          timeline.set(shape, { autoAlpha: 1, strokeDasharray: length, strokeDashoffset: length }, at);
          timeline.to(shape, { strokeDashoffset: 0, duration, ease: "power1.inOut" }, at);
        } else {
          timeline.to(node, { autoAlpha: 1, duration }, at);
        }
      } else if (op === "highlight") {
        timeline.to(node, { scale: 1.07, filter: "brightness(1.7)", transformOrigin: "50% 50%", duration: duration / 2, yoyo: true, repeat: 1 }, at);
      } else if (op === "pulse") {
        timeline.to(node, { scale: 1.05, transformOrigin: "50% 50%", duration: duration / 4, yoyo: true, repeat: 3 }, at);
      } else if (op === "morph") {
        const toNode = cue.action.toTargetId ? refs.get(cue.action.toTargetId) : null;
        timeline.to(node, { autoAlpha: 0, duration: duration / 2 }, at);
        if (toNode) timeline.to(toNode, { autoAlpha: 1, duration: duration / 2 }, at + duration / 2);
      } else if (op === "move") {
        const element = segment.scene.elements.find((item) => item.id === cue.action.targetId);
        const { toX, toY } = cue.action;
        if (element?.type === "point" && layout.mapper) {
          timeline.to(node, {
            attr: {
              ...(toX != null ? { cx: layout.mapper.toScreenX(toX) } : {}),
              ...(toY != null ? { cy: layout.mapper.toScreenY(toY) } : {}),
            },
            duration, ease: "power1.inOut",
          }, at);
        } else if (node instanceof HTMLElement) {
          timeline.to(node, {
            ...(toX != null ? { left: `${(toX / 960) * 100}%` } : {}),
            ...(toY != null ? { top: `${(toY / 540) * 100}%` } : {}),
            duration, ease: "power1.inOut",
          }, at);
        } else {
          timeline.to(node, {
            ...(toX != null ? { x: toX } : {}), ...(toY != null ? { y: toY } : {}),
            duration, ease: "power1.inOut",
          }, at);
        }
      } else {
        timeline.to(node, { autoAlpha: 0, duration }, at);
      }
    }

    timelineRef.current = timeline;
    if (reducedMotion) timeline.progress(1);
    return () => { timeline.kill(); timelineRef.current = null; };
  }, [segment, alignment, durationMs, layout, reducedMotion]);

  useLayoutEffect(() => {
    if (reducedMotion) return;
    let frame = 0;
    const tick = () => {
      const timeline = timelineRef.current;
      if (timeline) {
        const ms = Math.min(Math.max(clockRef.current.ms, 0), durationMs);
        timeline.time(ms / 1_000, true);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [clockRef, durationMs, reducedMotion]);

  const axes = layout.axes;
  const mapper = layout.mapper;

  return (
    <div className="lesson-visual whiteboard-stage" ref={rootRef} role="img" aria-label={`${segment.narration} ${segment.learnerShouldNotice.join("。")}`}>
      <svg viewBox="0 0 960 540" aria-hidden="true">
        <defs>
          <linearGradient id="wb-curve" x1="0" x2="1"><stop stopColor="#71efff" /><stop offset="1" stopColor="#9c78ff" /></linearGradient>
          <filter id="wb-glow"><feGaussianBlur stdDeviation="5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <rect width="960" height="540" fill="#070b15" />
        <g className="visual-grid"><path d="M80 440H900M120 70V480" /><path d="M120 390H900M120 340H900M120 290H900M120 240H900M120 190H900M120 140H900M200 70V440M280 70V440M360 70V440M440 70V440M520 70V440M600 70V440M680 70V440M760 70V440" /></g>

        {axes && mapper ? (
          <g className="whiteboard-axes" ref={setElementRef(axes.id)}>
            <line x1={PLOT_AREA.left} x2={PLOT_AREA.right}
              y1={axes.yMin <= 0 && axes.yMax >= 0 ? mapper.toScreenY(0) : PLOT_AREA.bottom}
              y2={axes.yMin <= 0 && axes.yMax >= 0 ? mapper.toScreenY(0) : PLOT_AREA.bottom} />
            <line y1={PLOT_AREA.top} y2={PLOT_AREA.bottom}
              x1={axes.xMin <= 0 && axes.xMax >= 0 ? mapper.toScreenX(0) : PLOT_AREA.left}
              x2={axes.xMin <= 0 && axes.xMax >= 0 ? mapper.toScreenX(0) : PLOT_AREA.left} />
            <text x={PLOT_AREA.right - 4} y={PLOT_AREA.bottom + 26} textAnchor="end">{axes.xLabel ?? "x"}</text>
            <text x={PLOT_AREA.left - 12} y={PLOT_AREA.top + 12} textAnchor="end">{axes.yLabel ?? "y"}</text>
            <text x={PLOT_AREA.left} y={PLOT_AREA.bottom + 26}>{axes.xMin}</text>
            <text x={PLOT_AREA.right - 4} y={PLOT_AREA.bottom + 26} textAnchor="end" dx="-38">{axes.xMax}</text>
          </g>
        ) : null}

        {segment.scene.elements.map((element) => {
          const color = "color" in element ? WHITEBOARD_COLORS[element.color] : WHITEBOARD_COLORS.ink;
          if (element.type === "plot") {
            const placed = layout.plotPlacements.get(element.id);
            if (!placed) return null;
            return (
              <g key={element.id}>
                <path ref={setElementRef(element.id)} d={placed.path} fill="none"
                  stroke={element.color === "cyan" ? "url(#wb-curve)" : color} strokeWidth="6" strokeLinecap="round" />
                {placed.markPoint ? <circle cx={placed.markPoint.x} cy={placed.markPoint.y} r="9" fill={WHITEBOARD_COLORS.amber} filter="url(#wb-glow)" /> : null}
              </g>
            );
          }
          if (element.type === "point" && mapper) {
            return (
              <g key={element.id}>
                <circle ref={setElementRef(element.id)} cx={mapper.toScreenX(element.x)} cy={mapper.toScreenY(element.y)} r="9" fill={color} filter="url(#wb-glow)" />
                {element.label ? <text className="whiteboard-caption-text" x={mapper.toScreenX(element.x) + 14} y={mapper.toScreenY(element.y) - 12}>{element.label}</text> : null}
              </g>
            );
          }
          if (element.type === "mathline" && mapper) {
            return <line key={element.id} ref={setElementRef(element.id)}
              x1={mapper.toScreenX(element.x1)} y1={mapper.toScreenY(element.y1)}
              x2={mapper.toScreenX(element.x2)} y2={mapper.toScreenY(element.y2)}
              stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray={element.dashed ? "9 8" : undefined} />;
          }
          if (element.type === "line") {
            return <line key={element.id} ref={setElementRef(element.id)} x1={element.x1} y1={element.y1} x2={element.x2} y2={element.y2}
              stroke={color} strokeWidth="4" strokeLinecap="round" strokeDasharray={element.dashed ? "9 8" : undefined} />;
          }
          if (element.type === "arrow") {
            return (
              <g key={element.id} ref={setElementRef(element.id)}>
                <line x1={element.x1} y1={element.y1} x2={element.x2} y2={element.y2} stroke={color} strokeWidth="4" strokeLinecap="round" />
                <polygon points={arrowHead(element.x1, element.y1, element.x2, element.y2)} fill={color} />
              </g>
            );
          }
          if (element.type === "rect") {
            return <rect key={element.id} ref={setElementRef(element.id)} x={element.x} y={element.y} width={element.width} height={element.height}
              rx="14" fill="none" stroke={color} strokeWidth="3" />;
          }
          if (element.type === "circle") {
            return <circle key={element.id} ref={setElementRef(element.id)} cx={element.cx} cy={element.cy} r={element.r} fill="none" stroke={color} strokeWidth="3" />;
          }
          if (element.type === "text") {
            const placed = layout.textPlacements.get(element.id);
            if (!placed) return null;
            // SVG text does not wrap; if a line would exceed its region, shrink
            // it to fit so nothing spills past the whiteboard frame.
            const estimatedWidth = element.content.length * TEXT_SIZES[element.size] * 0.6;
            const overflows = estimatedWidth > placed.maxWidth;
            return <text key={element.id} ref={setElementRef(element.id)} className={`whiteboard-text whiteboard-text--${element.size}`}
              x={placed.x} y={placed.y} fill={color} fontSize={TEXT_SIZES[element.size]}
              textAnchor={placed.centered ? "middle" : "start"}
              textLength={overflows ? placed.maxWidth : undefined} lengthAdjust={overflows ? "spacingAndGlyphs" : undefined}>{element.content}</text>;
          }
          if (element.type === "label") {
            const target = segment.scene.elements.find((item) => item.id === element.targetId);
            const center = target ? elementCenter(target, layout) : null;
            if (!center) return null;
            const offset = labelOffset(element.placement);
            return <text key={element.id} ref={setElementRef(element.id)} className="whiteboard-caption-text"
              x={center.x + offset.dx} y={center.y + offset.dy} fill={color} textAnchor={offset.anchor}>{element.content}</text>;
          }
          return null;
        })}
      </svg>

      <div className="whiteboard-overlay" aria-hidden="true">
        {segment.scene.elements.map((element) => {
          if (element.type !== "formula") return null;
          const placed = layout.textPlacements.get(element.id);
          if (!placed) return null;
          return (
            <div key={element.id} ref={setElementRef(element.id)}
              className={`whiteboard-formula whiteboard-formula--${element.size}`}
              style={{
                left: `${(placed.x / 960) * 100}%`, top: `${(placed.y / 540) * 100}%`,
                transform: placed.centered ? "translate(-50%, -50%)" : "translate(0, -50%)",
                color: WHITEBOARD_COLORS[element.color],
              }}
              dangerouslySetInnerHTML={{ __html: katex.renderToString(element.katex, { throwOnError: false, displayMode: false }) }} />
          );
        })}
      </div>

      <div className="lesson-visual__badge"><span>AI WHITEBOARD</span><strong>{segment.learnerShouldNotice[0]}</strong></div>
    </div>
  );
}
