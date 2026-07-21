import { afterEach, describe, expect, it, vi } from "vitest";
import { buildDerivativeLesson } from "@/lib/lesson/builder";
import { verifyLessonMath } from "@/lib/media/manim-client";

const lesson = buildDerivativeLesson(
  "Differentiate f(x)=(x^2+1)^3 and explain the chain rule.",
  "en",
);

afterEach(() => vi.unstubAllGlobals());

describe("optional Manim math verification", () => {
  it("keeps the deterministic SVG lesson when the renderer is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));

    await expect(verifyLessonMath(lesson, "http://127.0.0.1:8787")).resolves.toBe(lesson);
  });

  it("keeps the deterministic SVG lesson when the renderer returns an error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })));

    await expect(verifyLessonMath(lesson, "http://127.0.0.1:8787")).resolves.toBe(lesson);
  });

  it("blocks publication when a healthy verifier explicitly disagrees", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({
      derivative_ast: lesson.schemaVersion === 2 ? lesson.mathModel.derivativeExpression : null,
      capability: "chain",
      derivative_text: "verified",
      expected_matches: false,
    })));

    await expect(verifyLessonMath(lesson, "http://127.0.0.1:8787"))
      .rejects.toThrow("independent symbolic verifier disagreed");
  });
});
