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
- Dark background: set config or self.camera.background_color to "#070B15". Use these accent colors: cyan "#71EFFF", amber "#FFCC68", violet "#9C78FF", muted "#8290A5".
- Render math with MathTex/Tex using valid LaTeX. Keep everything inside the frame; avoid overlapping mobjects; use .arrange, .next_to, .to_edge, and .shift for layout.
- Animate progressively (Write, Create, FadeIn, Transform, MoveAlongPath) so the visual unfolds with the explanation. Aim the total animation to run roughly the target number of seconds; it will be retimed to the narration afterward, so do not add audio.
- Valid v0.20.1 API only. Do not use removed or renamed functions. No network, file, or system access.

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
