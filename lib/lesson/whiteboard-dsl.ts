import katex from "katex";
import { z } from "zod";
import { evaluateExpression, parseMathExpression } from "@/lib/math/expression";

export const WHITEBOARD_WIDTH = 960;
export const WHITEBOARD_HEIGHT = 540;

export const WhiteboardColorSchema = z.enum(["cyan", "amber", "violet", "muted", "ink"]);
export type WhiteboardColor = z.infer<typeof WhiteboardColorSchema>;

export const WHITEBOARD_COLORS: Record<WhiteboardColor, string> = {
  cyan: "#71efff",
  amber: "#ffcc68",
  violet: "#9c78ff",
  muted: "#8290a5",
  ink: "#e9f7ff",
};

export const WhiteboardRegionSchema = z.enum(["title", "main", "left", "right", "footer"]);
export type WhiteboardRegion = z.infer<typeof WhiteboardRegionSchema>;

const ElementIdSchema = z.string().regex(/^[a-z0-9-]+$/).max(40);
const ScreenXSchema = z.number().min(0).max(WHITEBOARD_WIDTH);
const ScreenYSchema = z.number().min(0).max(WHITEBOARD_HEIGHT);

// Screen-space elements position by region (interpreter stacks them) or explicit x/y.
const placement = {
  id: ElementIdSchema,
  region: WhiteboardRegionSchema.nullish(),
  x: ScreenXSchema.nullish(),
  y: ScreenYSchema.nullish(),
};

const MathCoordSchema = z.number().min(-1_000).max(1_000);

export const WhiteboardElementSchema = z.discriminatedUnion("type", [
  z.object({
    ...placement, type: z.literal("text"),
    content: z.string().min(1).max(120),
    size: z.enum(["sm", "md", "lg"]),
    color: WhiteboardColorSchema,
  }).strict(),
  z.object({
    ...placement, type: z.literal("formula"),
    katex: z.string().min(1).max(200),
    size: z.enum(["sm", "md", "lg"]),
    color: WhiteboardColorSchema,
  }).strict(),
  // Exactly one axes element defines the math→screen mapping for every
  // math-space element (plot, point, mathline) in the scene.
  z.object({
    id: ElementIdSchema, type: z.literal("axes"),
    xMin: MathCoordSchema, xMax: MathCoordSchema,
    yMin: MathCoordSchema, yMax: MathCoordSchema,
    xLabel: z.string().max(20).nullish(),
    yLabel: z.string().max(20).nullish(),
  }).strict(),
  z.object({
    id: ElementIdSchema, type: z.literal("plot"),
    expression: z.string().min(1).max(180),
    xMin: MathCoordSchema, xMax: MathCoordSchema,
    color: WhiteboardColorSchema,
    markPointAtX: MathCoordSchema.nullish(),
  }).strict(),
  z.object({
    id: ElementIdSchema, type: z.literal("point"),
    x: MathCoordSchema, y: MathCoordSchema,
    color: WhiteboardColorSchema,
    label: z.string().max(20).nullish(),
  }).strict(),
  z.object({
    id: ElementIdSchema, type: z.literal("mathline"),
    x1: MathCoordSchema, y1: MathCoordSchema, x2: MathCoordSchema, y2: MathCoordSchema,
    color: WhiteboardColorSchema,
    dashed: z.boolean().nullish(),
  }).strict(),
  z.object({
    id: ElementIdSchema, type: z.literal("line"),
    x1: ScreenXSchema, y1: ScreenYSchema, x2: ScreenXSchema, y2: ScreenYSchema,
    color: WhiteboardColorSchema,
    dashed: z.boolean().nullish(),
  }).strict(),
  z.object({
    id: ElementIdSchema, type: z.literal("arrow"),
    x1: ScreenXSchema, y1: ScreenYSchema, x2: ScreenXSchema, y2: ScreenYSchema,
    color: WhiteboardColorSchema,
  }).strict(),
  z.object({
    id: ElementIdSchema, type: z.literal("rect"),
    x: ScreenXSchema, y: ScreenYSchema,
    width: z.number().min(4).max(WHITEBOARD_WIDTH), height: z.number().min(4).max(WHITEBOARD_HEIGHT),
    color: WhiteboardColorSchema,
  }).strict(),
  z.object({
    id: ElementIdSchema, type: z.literal("circle"),
    cx: ScreenXSchema, cy: ScreenYSchema, r: z.number().min(2).max(270),
    color: WhiteboardColorSchema,
  }).strict(),
  z.object({
    id: ElementIdSchema, type: z.literal("label"),
    targetId: ElementIdSchema,
    content: z.string().min(1).max(60),
    placement: z.enum(["above", "below", "left", "right"]),
    color: WhiteboardColorSchema,
  }).strict(),
]);
export type WhiteboardElement = z.infer<typeof WhiteboardElementSchema>;

export const WhiteboardAnchorSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("narration"), text: z.string().min(1).max(80) }).strict(),
  z.object({ kind: z.literal("ratio"), value: z.number().min(0).max(1) }).strict(),
]);
export type WhiteboardAnchor = z.infer<typeof WhiteboardAnchorSchema>;

export const WhiteboardActionSchema = z.object({
  op: z.enum(["appear", "write", "draw", "highlight", "pulse", "morph", "move", "fadeOut"]),
  targetId: ElementIdSchema,
  toTargetId: ElementIdSchema.nullish(),
  toX: z.number().min(-1_000).max(1_000).nullish(),
  toY: z.number().min(-1_000).max(1_000).nullish(),
  durationMs: z.number().int().min(200).max(6_000),
  anchor: WhiteboardAnchorSchema,
}).strict();
export type WhiteboardAction = z.infer<typeof WhiteboardActionSchema>;

export const WhiteboardSceneSchema = z.object({
  elements: z.array(WhiteboardElementSchema).min(1).max(12),
  actions: z.array(WhiteboardActionSchema).min(1).max(20),
}).strict();
export type WhiteboardScene = z.infer<typeof WhiteboardSceneSchema>;

const MATH_SPACE_TYPES = new Set(["plot", "point", "mathline"]);
const MOVABLE_TYPES = new Set(["text", "formula", "point", "line", "arrow", "rect", "circle", "label"]);
const MORPHABLE_TYPES = new Set(["text", "formula"]);

/**
 * Semantic validation beyond the zod shape. Returns a list of human-readable
 * problems (empty means valid) so generation retries can feed them back to the
 * model verbatim.
 */
export function validateWhiteboardScene(scene: WhiteboardScene, narration: string): string[] {
  const problems: string[] = [];
  const byId = new Map<string, WhiteboardElement>();
  for (const element of scene.elements) {
    if (byId.has(element.id)) problems.push(`Duplicate element id "${element.id}".`);
    byId.set(element.id, element);
  }

  const axes = scene.elements.filter((element) => element.type === "axes");
  const mathElements = scene.elements.filter((element) => MATH_SPACE_TYPES.has(element.type));
  if (axes.length > 1) problems.push("A scene may contain at most one axes element.");
  if (mathElements.length > 0 && axes.length === 0) {
    problems.push("plot, point, and mathline elements require exactly one axes element in the same scene.");
  }

  for (const element of scene.elements) {
    if (element.type === "axes" || element.type === "plot") {
      if (element.xMin >= element.xMax) problems.push(`Element "${element.id}" needs xMin < xMax.`);
    }
    if (element.type === "axes" && element.yMin >= element.yMax) problems.push(`Element "${element.id}" needs yMin < yMax.`);
    if (element.type === "plot") {
      try {
        parseMathExpression(element.expression);
      } catch (error) {
        problems.push(`Plot "${element.id}" expression "${element.expression}" is not in the supported grammar (${(error as Error).message}) — use only x, integers, + - * /, ^0..6, sin, cos, exp, ln.`);
      }
    }
    if (element.type === "formula") {
      try {
        katex.renderToString(element.katex, { throwOnError: true, displayMode: true });
      } catch {
        problems.push(`Formula "${element.id}" contains KaTeX that does not compile: ${element.katex}`);
      }
    }
    if (element.type === "label" && !byId.has(element.targetId)) {
      problems.push(`Label "${element.id}" points at missing element "${element.targetId}".`);
    }
  }

  const lowerNarration = narration.toLowerCase();
  for (const [index, action] of scene.actions.entries()) {
    const target = byId.get(action.targetId);
    if (!target) {
      problems.push(`Action ${index + 1} (${action.op}) targets missing element "${action.targetId}".`);
      continue;
    }
    if (action.op === "morph") {
      const to = action.toTargetId ? byId.get(action.toTargetId) : undefined;
      if (!to) problems.push(`Action ${index + 1} (morph) needs an existing toTargetId.`);
      else if (!MORPHABLE_TYPES.has(target.type) || to.type !== target.type) {
        problems.push(`Action ${index + 1} (morph) must transform a text into a text or a formula into a formula.`);
      }
    }
    if (action.op === "move") {
      if (action.toX == null && action.toY == null) problems.push(`Action ${index + 1} (move) needs toX and/or toY.`);
      if (!MOVABLE_TYPES.has(target.type)) problems.push(`Action ${index + 1} (move) cannot move a ${target.type} element.`);
    }
    if (action.anchor.kind === "narration" && !lowerNarration.includes(action.anchor.text.toLowerCase())) {
      problems.push(`Action ${index + 1} anchor "${action.anchor.text}" is not a phrase from the narration.`);
    }
  }

  return problems;
}

const clampCoord = (value: number) => Math.max(-1_000, Math.min(1_000, value));

function synthesizeAxes(mathElements: WhiteboardElement[]): WhiteboardElement {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const element of mathElements) {
    if (element.type === "plot") {
      xs.push(element.xMin, element.xMax);
      try {
        const parsed = parseMathExpression(element.expression);
        for (let step = 0; step <= 20; step += 1) {
          const x = element.xMin + (step / 20) * (element.xMax - element.xMin);
          const y = evaluateExpression(parsed, x);
          if (Number.isFinite(y)) ys.push(y);
        }
      } catch { /* grammar errors are reported separately */ }
    } else if (element.type === "point") {
      xs.push(element.x); ys.push(element.y);
    } else if (element.type === "mathline") {
      xs.push(element.x1, element.x2); ys.push(element.y1, element.y2);
    }
  }
  const xMin = xs.length ? Math.min(...xs) : -5;
  const xMax = xs.length ? Math.max(...xs) : 5;
  const yMinRaw = ys.length ? Math.min(...ys) : -5;
  const yMaxRaw = ys.length ? Math.max(...ys) : 5;
  const yPad = Math.max(1, (yMaxRaw - yMinRaw) * 0.12);
  // Sampled y-values (e.g. exp on a wide range) can dwarf the ±1000 schema
  // bound, and a synthesized frame must never make the final parse throw.
  return fixRanges({
    id: "axes-auto", type: "axes",
    xMin: clampCoord(xMin === xMax ? xMin - 1 : xMin),
    xMax: clampCoord(xMin === xMax ? xMax + 1 : xMax),
    yMin: clampCoord(Math.floor(yMinRaw - yPad)),
    yMax: clampCoord(Math.ceil(yMaxRaw + yPad)),
    xLabel: "x", yLabel: "y",
  });
}

function fixRanges(element: WhiteboardElement): WhiteboardElement {
  if (element.type !== "axes" && element.type !== "plot") return element;
  let { xMin, xMax } = element;
  if (xMin > xMax) [xMin, xMax] = [xMax, xMin];
  if (xMin === xMax) { xMin = clampCoord(xMin - 1); xMax = clampCoord(xMax + 1); }
  if (element.type === "plot") return { ...element, xMin, xMax };
  let { yMin, yMax } = element;
  if (yMin > yMax) [yMin, yMax] = [yMax, yMin];
  if (yMin === yMax) { yMin = clampCoord(yMin - 1); yMax = clampCoord(yMax + 1); }
  return { ...element, xMin, xMax, yMin, yMax };
}

/**
 * Repair the mechanically-fixable mistakes an LLM commonly makes so a whole
 * lesson is not rejected over a stray reference: rename duplicate ids, fix
 * reversed ranges, collapse multiple axes into one that covers every math
 * element, synthesize a missing axes, drop actions/labels that point at
 * elements that do not exist, downgrade narration anchors that do not quote
 * the narration, and downgrade unusable move/morph actions. Genuine content
 * errors (bad plot grammar, broken KaTeX) are left for
 * validateWhiteboardScene to surface so a retry can fix them properly.
 */
export function sanitizeWhiteboardScene(scene: WhiteboardScene, narration: string): WhiteboardScene {
  // Rename later duplicates so every id is unique; actions keep addressing the
  // first occurrence, which is what the model almost always means.
  const seenIds = new Set<string>();
  let elements = scene.elements.map((element) => {
    let id = element.id;
    let suffix = 2;
    while (seenIds.has(id)) {
      // Truncate the base, never the suffix, so each candidate is distinct
      // even at the 40-character id cap and the loop always terminates.
      const tag = `-${suffix}`;
      id = `${element.id.slice(0, 40 - tag.length)}${tag}`;
      suffix += 1;
    }
    seenIds.add(id);
    return id === element.id ? element : { ...element, id };
  }).map(fixRanges);

  // At most one axes per scene: replace them all with a single frame that
  // covers every math element (and every original axes range), keeping the
  // first axes' id and labels so actions still resolve.
  const axesElements = elements.filter((element) => element.type === "axes") as Extract<WhiteboardElement, { type: "axes" }>[];
  const mathElements = elements.filter((element) => MATH_SPACE_TYPES.has(element.type));
  const droppedAxesIds = new Set<string>();
  if (axesElements.length > 1) {
    const synthesized = synthesizeAxes(mathElements) as Extract<WhiteboardElement, { type: "axes" }>;
    const first = axesElements[0];
    const merged = fixRanges({
      ...first,
      xMin: clampCoord(Math.min(synthesized.xMin, ...axesElements.map((axes) => axes.xMin))),
      xMax: clampCoord(Math.max(synthesized.xMax, ...axesElements.map((axes) => axes.xMax))),
      yMin: clampCoord(Math.min(synthesized.yMin, ...axesElements.map((axes) => axes.yMin))),
      yMax: clampCoord(Math.max(synthesized.yMax, ...axesElements.map((axes) => axes.yMax))),
    });
    for (const axes of axesElements.slice(1)) droppedAxesIds.add(axes.id);
    elements = elements.flatMap((element): WhiteboardElement[] => element.type !== "axes" ? [element] : element.id === first.id ? [merged] : []);
  } else if (mathElements.length > 0 && axesElements.length === 0) {
    if (elements.length >= 12) {
      // The frame must fit: make room by dropping the least structural
      // element (labels first, plots and math geometry last).
      const dropPreference: WhiteboardElement["type"][] = ["label", "line", "arrow", "rect", "circle", "text", "formula", "mathline", "point"];
      const types = elements.map((element) => element.type);
      for (const type of dropPreference) {
        const index = types.lastIndexOf(type);
        if (index >= 0) { elements = elements.filter((_, position) => position !== index); break; }
      }
    }
    if (elements.length < 12) elements = [synthesizeAxes(mathElements), ...elements];
  }
  const survivingAxesId = (elements.find((element) => element.type === "axes"))?.id;

  const ids = new Set(elements.map((element) => element.id));
  // Drop labels that point at a missing target; they would render nothing.
  elements = elements.filter((element) => element.type !== "label" || ids.has(element.targetId));
  if (elements.length === 0) {
    // Everything was dropped (e.g. only orphaned labels survived upstream
    // filtering) — keep the scene legal so the lesson can still publish.
    elements = [{
      id: "note-auto", type: "text", region: "main", x: null, y: null,
      content: "Listen to the narration for this step", size: "md", color: "muted",
    }];
  }
  const liveIds = new Set(elements.map((element) => element.id));
  const byId = new Map(elements.map((element) => [element.id, element]));

  const lowerNarration = narration.toLowerCase();
  const total = scene.actions.length;
  const actions = scene.actions
    // Actions aimed at a merged-away axes now address the surviving frame.
    .map((action) => droppedAxesIds.has(action.targetId) && survivingAxesId ? { ...action, targetId: survivingAxesId } : action)
    .filter((action) => liveIds.has(action.targetId))
    .map((action, index) => {
      let next = action;
      if (next.op === "morph") {
        const to = next.toTargetId != null ? byId.get(next.toTargetId) : undefined;
        const from = byId.get(next.targetId);
        if (!to || !from || !MORPHABLE_TYPES.has(from.type) || to.type !== from.type) {
          // An unusable morph still needs its reveal: show the destination if
          // it exists, otherwise just emphasize the source.
          next = to
            ? { ...next, op: "appear", targetId: to.id, toTargetId: null }
            : { ...next, op: "highlight", toTargetId: null };
        }
      }
      if (next.op === "move") {
        const target = byId.get(next.targetId);
        if ((next.toX == null && next.toY == null) || !target || !MOVABLE_TYPES.has(target.type)) {
          next = { ...next, op: "pulse", toX: null, toY: null };
        }
      }
      if (next.anchor.kind === "narration" && !lowerNarration.includes(next.anchor.text.toLowerCase())) {
        next = { ...next, anchor: { kind: "ratio" as const, value: total > 0 ? index / total : 0 } };
      }
      return next;
    });

  // A scene must keep at least one element and one action.
  const safeActions = actions.length > 0
    ? actions
    : elements.length > 0
      ? [{ op: "appear" as const, targetId: elements[0].id, toTargetId: null, toX: null, toY: null, durationMs: 800, anchor: { kind: "ratio" as const, value: 0 } }]
      : [];

  return WhiteboardSceneSchema.parse({ elements, actions: safeActions });
}

/**
 * Last-resort rescue for a scene that still fails validation after the model's
 * retries: drop the elements that cannot render (plots outside the expression
 * grammar, formulas whose KaTeX does not compile) together with everything
 * that referenced them, then re-run the mechanical sanitizer. A lesson missing
 * one visual beats a lesson that never publishes.
 */
export function dropUnrenderableElements(scene: WhiteboardScene, narration: string): WhiteboardScene {
  const keep = scene.elements.filter((element) => {
    if (element.type === "plot") {
      try { parseMathExpression(element.expression); return true; } catch { return false; }
    }
    if (element.type === "formula") {
      try { katex.renderToString(element.katex, { throwOnError: true, displayMode: true }); return true; } catch { return false; }
    }
    return true;
  });
  // Cascade before the empty-check: a label whose target was just dropped
  // must not count as the sole survivor, or the scene ends up empty.
  const keepIds = new Set(keep.map((element) => element.id));
  const cascaded = keep.filter((element) => element.type !== "label" || keepIds.has(element.targetId));
  const fallback: WhiteboardElement[] = cascaded.length > 0 ? cascaded : [{
    id: "note-auto", type: "text", region: "main", x: null, y: null,
    content: "Listen to the narration for this step", size: "md", color: "muted",
  }];
  const liveIds = new Set(fallback.map((element) => element.id));
  const actions = scene.actions.filter((action) => liveIds.has(action.targetId));
  return sanitizeWhiteboardScene(WhiteboardSceneSchema.parse({
    elements: fallback,
    actions: actions.length > 0 ? actions : [{
      op: "appear" as const, targetId: fallback[0].id, toTargetId: null, toX: null, toY: null,
      durationMs: 800, anchor: { kind: "ratio" as const, value: 0 },
    }],
  }), narration);
}
