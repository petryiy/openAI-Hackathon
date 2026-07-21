import { describe, expect, it } from "vitest";
import { lintManimCode, looksLikeValidScene } from "@/lib/ai/manim-code-provider";

const CLEAN_SCENE = `from manim import *
import numpy as np

class GeneratedScene(Scene):
    def construct(self):
        self.camera.background_color = "#070B15"
        axes = Axes(x_range=[-1, 3, 1], y_range=[0, 9, 3], x_length=7, y_length=4.5)
        graph = axes.plot(lambda x: x ** 2, x_range=[-1, 3], color="#71EFFF")
        eq = MathTex(r"y = x^{2}", color="#FFCC68")
        eq.next_to(axes, RIGHT, buff=0.4)
        self.play(Create(axes), run_time=2)
        self.play(Create(graph), run_time=3)
        self.play(Write(eq))
        self.wait(2)
`;

describe("manim code lint", () => {
  it("passes a clean v0.20 scene", () => {
    expect(looksLikeValidScene(CLEAN_SCENE)).toBe(true);
    expect(lintManimCode(CLEAN_SCENE)).toBeNull();
  });

  it("catches the removed t_min/t_max parameters", () => {
    const code = CLEAN_SCENE.replace("x_range=[-1, 3], color", "t_min=-1, t_max=3, color");
    expect(lintManimCode(code)).toContain("t_range");
  });

  it("catches ShowCreation, get_graph, GraphScene, and TexMobject", () => {
    expect(lintManimCode(CLEAN_SCENE.replace("Create(graph)", "ShowCreation(graph)"))).toContain("Create");
    expect(lintManimCode(CLEAN_SCENE.replace("axes.plot(", "axes.get_graph("))).toContain("Axes.plot");
    expect(lintManimCode(`${CLEAN_SCENE}\nclass Old(GraphScene):\n    pass\n`)).toContain("GraphScene");
    expect(lintManimCode(CLEAN_SCENE.replace("MathTex(", "TexMobject("))).toContain("MathTex");
  });

  it("catches importing from the wrong manim package", () => {
    expect(lintManimCode(CLEAN_SCENE.replace("from manim import *", "from manimlib import *"))).toContain("manim");
  });

  it("does not flag a legitimate local variable named t_min", () => {
    const code = CLEAN_SCENE.replace(
      "axes = Axes(",
      "t_min = 0\n        t_max = 3\n        axes = Axes(",
    );
    expect(lintManimCode(code)).toBeNull();
  });

  it("ignores deprecated API mentioned only in comments", () => {
    const code = `${CLEAN_SCENE}        # note: never use ShowCreation or t_min= here\n`;
    expect(lintManimCode(code)).toBeNull();
  });

  it("catches removed x_min/x_max keyword arguments on Axes", () => {
    const code = CLEAN_SCENE.replace("Axes(x_range=[-1, 3, 1], y_range=[0, 9, 3]", "Axes(x_min=-1, x_max=3, y_min=0, y_max=9");
    expect(lintManimCode(code)).toContain("x_range");
  });

  it("catches removed FadeInFrom variants and MovingCameraScene-only camera access", () => {
    expect(lintManimCode(CLEAN_SCENE.replace("Write(eq)", "FadeInFromDown(eq)"))).toContain("FadeIn");
    expect(lintManimCode(`${CLEAN_SCENE.replace("self.wait(2)", "self.play(self.camera.frame.animate.scale(0.5))")}`)).toContain("MovingCameraScene");
  });

  it("still flags t_min when passed as a keyword argument across a line break", () => {
    const code = CLEAN_SCENE.replace("axes.plot(lambda x: x ** 2, x_range=[-1, 3], color=\"#71EFFF\")", "ParametricFunction(lambda t: [t, t, 0],\n            t_min=0, t_max=1)");
    expect(lintManimCode(code)).toContain("t_range");
  });
});
