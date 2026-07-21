import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { ModelConfigurationError, resolveReasoningEffort } from "@/lib/ai/provider";
import type { GenericSegment } from "@/lib/lesson/schema";

const ManimCodeSchema = z.object({ python_code: z.string().min(1).max(20_000) }).strict();

const SYSTEM_PROMPT = `You write a single Manim Community Edition v0.20.1 Scene that animates one segment of a math lesson, in the visual style of 3Blue1Brown. You are given the narration, the KaTeX formulas shown, and a short summary. Produce Python code and nothing else.

Strict requirements:
- Define exactly one class: "class GeneratedScene(Scene):" with a construct(self) method.
- import only from manim, math, and numpy. Never import os, sys, subprocess, pathlib, socket, or anything else. Never use open, eval, exec, __import__, or any name starting with an underscore other than defining construct/__init__ is NOT allowed either — do not reference dunders at all.
- Dark background: set self.camera.background_color to "#070B15". Use these accent colors: cyan "#71EFFF", amber "#FFCC68", violet "#9C78FF", muted "#8290A5".
- Animate progressively (Write, Create, FadeIn, Transform, MoveAlongPath) so the visual unfolds with the explanation. Aim the total animation to run roughly the target number of seconds; it will be retimed to the narration afterward, so do not add audio.
- No network, file, or system access.

Manim CE v0.20 API — the ONLY graph/curve API to use (older names crash):
- Axes: "axes = Axes(x_range=[xmin, xmax, step], y_range=[ymin, ymax, step], x_length=..., y_length=...)".
- Curves: "graph = axes.plot(lambda x: ..., x_range=[a, b], color=...)". NEVER use t_min= or t_max= (removed — ParametricFunction takes t_range=[t0, t1]). NEVER use axes.get_graph (renamed to axes.plot). NEVER use GraphScene (removed — use Scene plus Axes).
- Animations: use Create (ShowCreation was removed), Write, FadeIn, FadeOut, Transform, TransformMatchingTex. FadeInFrom*/FadeOutAndShift were removed — use FadeIn(m, shift=DOWN) / FadeOut(m, shift=UP).
- Text: Text(...) for words, MathTex(r"...") for math. TexMobject/TextMobject were removed.
- Never touch self.camera.frame (it requires MovingCameraScene); compose the shot by positioning and scaling mobjects.

LaTeX that must compile (a LaTeX error aborts the whole render):
- Always pass raw strings: MathTex(r"\\frac{d}{dx} e^{x}").
- Use plain amsmath commands only: frac, sqrt, sum, int, cdot, times, le, ge, to, infty, alpha-omega, sin, cos, ln, log, exp, text.
- No custom macros, no unicode characters inside MathTex/Tex, no % & # _ inside \\text{...}, and keep every brace balanced. If a formula is elaborate, simplify it rather than risk a compile error.

Fit inside the frame (the frame is 14.2 units wide and 8 tall, centered on the origin):
- Keep every mobject fully inside x in [-6.2, 6.2] and y in [-3.7, 3.7]; use .to_edge(..., buff=0.5) and .next_to(..., buff=0.3) rather than absolute far-edge positions.
- After composing any formula, group, or VGroup, if it could be wider than 12 units call .scale_to_fit_width(12) (and .scale_to_fit_height(7) when tall) BEFORE positioning it.
- Long formulas: font_size=36 or split across two lines with VGroup(...).arrange(DOWN, buff=0.3). Never let a formula touch the right edge.
- Avoid overlapping mobjects: FadeOut earlier content before showing something new in the same place.

Shape of a good scene (structure to imitate, adapt freely):
  from manim import *
  class GeneratedScene(Scene):
      def construct(self):
          self.camera.background_color = "#070B15"
          title = Text("Slope of a curve", color="#71EFFF").scale(0.8).to_edge(UP, buff=0.5)
          axes = Axes(x_range=[-1, 3, 1], y_range=[0, 9, 3], x_length=7, y_length=4.5).to_edge(DOWN, buff=0.6)
          graph = axes.plot(lambda x: x ** 2, x_range=[-1, 3], color="#71EFFF")
          eq = MathTex(r"y = x^{2}", color="#FFCC68").scale(0.9)
          eq.next_to(axes, RIGHT, buff=0.4).shift(UP)
          if eq.width > 3: eq.scale_to_fit_width(3)
          self.play(Write(title))
          self.play(Create(axes), run_time=2)
          self.play(Create(graph), run_time=3)
          self.play(Write(eq))
          self.wait(2)

If given a previous error traceback, fix the specific problem it reports and return the full corrected scene.`;

function client() {
  if (!process.env.OPENAI_API_KEY) throw new ModelConfigurationError("Add OPENAI_API_KEY to render cinematic Manim scenes.");
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 240_000, maxRetries: 0 });
}

export async function generateManimSceneCode(input: {
  segment: GenericSegment;
  targetDurationMs: number;
  previousCode?: string;
  previousError?: string;
}): Promise<string> {
  const { segment, targetDurationMs, previousCode, previousError } = input;
  const parts = [
    `Segment title: ${segment.title}`,
    `Narration: ${segment.narration}`,
    `Formulas (KaTeX): ${segment.displayFormulas.map((formula) => formula.katex).join(" | ") || "none"}`,
    `Key idea to make visible: ${segment.learnerShouldNotice.join("; ")}`,
    `Target duration: about ${Math.round(targetDurationMs / 1_000)} seconds.`,
  ];
  if (previousError && previousCode) {
    parts.push(`Your previous scene failed to render with this error:\n${previousError}\n\nPrevious code:\n${previousCode}\n\nReturn a corrected full scene.`);
  }
  const response = await client().responses.parse({
    model: process.env.OPENAI_CODE_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-5.6",
    reasoning: { mode: "standard", effort: resolveReasoningEffort() },
    input: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: parts.join("\n\n") },
    ],
    text: { verbosity: "low", format: zodTextFormat(ManimCodeSchema, "manim_scene") },
  });
  if (!response.output_parsed) throw new Error("The model did not return Manim scene code.");
  return response.output_parsed.python_code;
}

/** Cheap client-side gate before paying for a render attempt. */
export function looksLikeValidScene(code: string): boolean {
  return /class\s+GeneratedScene\s*\(\s*Scene\s*\)/.test(code) && code.includes("def construct") && code.length < 20_000;
}

const KNOWN_BAD_PATTERNS: Array<{ pattern: RegExp; message: string }> = [
  // Keyword-argument checks require a preceding "(" or "," so a legitimate
  // local variable like "t_min = 0" is never flagged.
  { pattern: /[(,]\s*t_min\s*=|[(,]\s*t_max\s*=/, message: "The t_min/t_max keyword arguments were removed in Manim CE — pass t_range=[start, end] (or use axes.plot(..., x_range=[a, b]))." },
  { pattern: /[(,]\s*[xy]_min\s*=|[(,]\s*[xy]_max\s*=/, message: "The x_min/x_max/y_min/y_max keyword arguments were removed in Manim CE — Axes and NumberLine take x_range=[min, max, step] and y_range=[min, max, step]." },
  { pattern: /\bShowCreation\b/, message: "ShowCreation was renamed to Create in Manim CE." },
  { pattern: /\.get_graph\s*\(/, message: "Axes.get_graph was renamed to Axes.plot in Manim CE." },
  { pattern: /\bGraphScene\b/, message: "GraphScene was removed in Manim CE — subclass Scene and build an Axes yourself." },
  { pattern: /\bTexMobject\b|\bTextMobject\b/, message: "TexMobject/TextMobject were removed — use MathTex, Tex, or Text." },
  { pattern: /\bFadeInFrom\w*\b|\bFadeOutAndShift\b/, message: "The FadeInFrom*/FadeOutAndShift variants were removed — use FadeIn(mobject, shift=..., scale=...) or FadeOut(mobject, shift=...)." },
  { pattern: /\bself\.camera\.frame\b/, message: "self.camera.frame only exists on MovingCameraScene — GeneratedScene subclasses Scene, so position and scale mobjects instead of moving the camera." },
  { pattern: /from\s+manimlib\b|import\s+manimlib\b/, message: "manimlib is the wrong package — import from manim (Manim Community Edition)." },
  { pattern: /\bself\.play\s*\(\s*\)/, message: "self.play() needs at least one animation." },
];

/**
 * Free pre-render lint for API mistakes that would definitely crash Manim
 * v0.20. Returns the problem to feed straight back to the model, or null when
 * the code is worth paying a render attempt for. Comments are stripped first
 * so a remark about the old API cannot block valid code.
 */
export function lintManimCode(code: string): string | null {
  const withoutComments = code.split("\n").map((line) => line.replace(/#.*$/, "")).join("\n");
  for (const { pattern, message } of KNOWN_BAD_PATTERNS) {
    if (pattern.test(withoutComments)) return message;
  }
  return null;
}
