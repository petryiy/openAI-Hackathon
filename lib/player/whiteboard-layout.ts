import { evaluateExpression, parseMathExpression, type ExpressionAst } from "@/lib/math/expression";
import type { WhiteboardElement, WhiteboardRegion, WhiteboardScene } from "@/lib/lesson/whiteboard-dsl";

// The graph frame matches the background grid the existing lesson visuals use.
export const PLOT_AREA = { left: 120, right: 900, top: 70, bottom: 440 } as const;

const REGION_BOXES: Record<WhiteboardRegion, { left: number; right: number; top: number; bottom: number; centered: boolean }> = {
  title: { left: 60, right: 900, top: 36, bottom: 130, centered: true },
  main: { left: 140, right: 880, top: 90, bottom: 420, centered: false },
  left: { left: 60, right: 460, top: 140, bottom: 430, centered: false },
  right: { left: 500, right: 900, top: 140, bottom: 430, centered: false },
  // Sits clear of the AI-whiteboard badge pinned to the very bottom of the frame.
  footer: { left: 60, right: 900, top: 436, bottom: 476, centered: true },
};

const SLOT_HEIGHTS = { sm: 44, md: 68, lg: 96 } as const;

export type AxesSpec = Extract<WhiteboardElement, { type: "axes" }>;

export type MathMapper = {
  toScreenX: (mathX: number) => number;
  toScreenY: (mathY: number) => number;
};

export function createMathMapper(axes: AxesSpec): MathMapper {
  const { left, right, top, bottom } = PLOT_AREA;
  return {
    toScreenX: (mathX) => left + ((mathX - axes.xMin) / (axes.xMax - axes.xMin)) * (right - left),
    toScreenY: (mathY) => bottom - ((mathY - axes.yMin) / (axes.yMax - axes.yMin)) * (bottom - top),
  };
}

export type PlacedText = { kind: "text"; x: number; y: number; centered: boolean; maxWidth: number };
export type PlacedPlot = { kind: "plot"; path: string; markPoint: { x: number; y: number } | null };
export type ElementPlacement = PlacedText | PlacedPlot;

export type SceneLayout = {
  axes: AxesSpec | null;
  mapper: MathMapper | null;
  /** Screen positions for text and formula elements (stacked or explicit). */
  textPlacements: Map<string, PlacedText>;
  /** Sampled SVG paths for plot elements. */
  plotPlacements: Map<string, PlacedPlot>;
};

function samplePlotPath(
  expression: ExpressionAst,
  xMin: number,
  xMax: number,
  axes: AxesSpec,
  mapper: MathMapper,
): string {
  const yPadding = (axes.yMax - axes.yMin) * 0.5;
  const segments: string[] = [];
  let pen: "up" | "down" = "up";
  const steps = 120;
  for (let index = 0; index <= steps; index += 1) {
    const mathX = xMin + (index / steps) * (xMax - xMin);
    const mathY = evaluateExpression(expression, mathX);
    if (!Number.isFinite(mathY) || mathY < axes.yMin - yPadding || mathY > axes.yMax + yPadding) {
      pen = "up";
      continue;
    }
    const x = mapper.toScreenX(mathX).toFixed(1);
    const y = mapper.toScreenY(mathY).toFixed(1);
    segments.push(`${pen === "up" ? "M" : "L"}${x} ${y}`);
    pen = "down";
  }
  return segments.join("");
}

export function layoutScene(scene: WhiteboardScene): SceneLayout {
  const axes = (scene.elements.find((element) => element.type === "axes") ?? null) as AxesSpec | null;
  const mapper = axes ? createMathMapper(axes) : null;

  const textPlacements = new Map<string, PlacedText>();
  const stackCursors = new Map<WhiteboardRegion, number>();
  for (const element of scene.elements) {
    if (element.type !== "text" && element.type !== "formula") continue;
    const region = element.region ?? "main";
    const box = REGION_BOXES[region];
    if (element.x != null && element.y != null) {
      textPlacements.set(element.id, { kind: "text", x: element.x, y: element.y, centered: false, maxWidth: Math.max(120, 920 - element.x) });
      continue;
    }
    const cursor = stackCursors.get(region) ?? box.top;
    const height = SLOT_HEIGHTS[element.size];
    textPlacements.set(element.id, {
      kind: "text",
      x: box.centered ? (box.left + box.right) / 2 : box.left,
      y: Math.min(cursor, box.bottom - height) + height / 2,
      centered: box.centered,
      maxWidth: box.right - box.left,
    });
    stackCursors.set(region, cursor + height);
  }

  const plotPlacements = new Map<string, PlacedPlot>();
  if (axes && mapper) {
    for (const element of scene.elements) {
      if (element.type !== "plot") continue;
      let parsed: ExpressionAst;
      try {
        parsed = parseMathExpression(element.expression);
      } catch {
        continue; // Validated upstream; an unparseable plot renders as nothing rather than crashing playback.
      }
      const markX = element.markPointAtX;
      const markY = markX == null ? null : evaluateExpression(parsed, markX);
      plotPlacements.set(element.id, {
        kind: "plot",
        path: samplePlotPath(parsed, element.xMin, element.xMax, axes, mapper),
        markPoint: markX != null && markY != null && Number.isFinite(markY)
          ? { x: mapper.toScreenX(markX), y: mapper.toScreenY(markY) }
          : null,
      });
    }
  }

  return { axes, mapper, textPlacements, plotPlacements };
}
