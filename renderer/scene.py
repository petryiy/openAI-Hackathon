from __future__ import annotations

import json
import math
import os
from pathlib import Path

from manim import *

config.background_color = "#070B15"
CYAN = ManimColor("#71EFFF")
AMBER = ManimColor("#FFCC68")
VIOLET = ManimColor("#9C78FF")
MUTED = ManimColor("#8290A5")


def spec() -> dict:
    path = Path(os.environ["RENDER_SPEC_PATH"]).resolve()
    if path.parent != Path("/work") and Path("/work") not in path.parents:
        raise ValueError("Spec must be inside the isolated work directory")
    return json.loads(path.read_text(encoding="utf-8"))


class GeneratedLessonScene(Scene):
    def construct(self):
        data = spec()
        template = data["template_id"]
        handlers = {
            "derivative_story_hook": self.story_hook,
            "derivative_secant_to_tangent": self.secant_to_tangent,
            "derivative_limit_definition": self.limit_definition,
            "derivative_worked_example": self.worked_example,
            "derivative_same_value_different_slope": self.same_value_different_slope,
            "derivative_algebra_expansion_repair": self.algebra_repair,
            "derivative_cancel_h_repair": self.cancel_h_repair,
            "derivative_function_derivative_link": self.function_derivative_link,
        }
        if template not in handlers:
            raise ValueError("Unknown template")
        handlers[template]()

    def model(self):
        params = spec()["params"]
        return params["coefficients"], params["evaluation_point"]

    @staticmethod
    def polynomial(coefficients, x):
        return sum(coefficient * x ** degree for degree, coefficient in enumerate(coefficients))

    @staticmethod
    def derivative(coefficients, x):
        return sum(degree * coefficient * x ** (degree - 1) for degree, coefficient in enumerate(coefficients) if degree)

    @staticmethod
    def polynomial_tex(coefficients, variable="x"):
        terms = []
        for degree in range(3, -1, -1):
            coefficient = coefficients[degree]
            if coefficient == 0:
                continue
            magnitude = abs(coefficient)
            factor = str(magnitude) if degree == 0 else ("" if magnitude == 1 else str(magnitude)) + variable + (f"^{{{degree}}}" if degree > 1 else "")
            prefix = "-" if not terms and coefficient < 0 else "" if not terms else " - " if coefficient < 0 else " + "
            terms.append(prefix + factor)
        return "".join(terms) or "0"

    def axes(self, coefficients=None, evaluation_point=None, include_derivative=False):
        if coefficients is None:
            coefficients, evaluation_point = self.model()
        x_min, x_max = evaluation_point - 3, evaluation_point + 3
        values = [self.polynomial(coefficients, x_min + index * (x_max - x_min) / 60) for index in range(61)]
        if include_derivative:
            values.extend(self.derivative(coefficients, x_min + index * (x_max - x_min) / 60) for index in range(61))
        y_min, y_max = min(values), max(values)
        padding = max(1, (y_max - y_min) * .12)
        y_min, y_max = math.floor(y_min - padding), math.ceil(y_max + padding)
        y_step = max(1, math.ceil((y_max - y_min) / 6))
        return Axes(x_range=[x_min, x_max, 1], y_range=[y_min, y_max, y_step], x_length=9, y_length=5, axis_config={"color": MUTED})

    def story_hook(self):
        title = Text("AVERAGE IS NOT ENOUGH", color=CYAN, font_size=40)
        subtitle = Text("What is changing right now?", color=MUTED, font_size=26).next_to(title, DOWN)
        route = CubicBezier(LEFT*5+DOWN*2, LEFT*2+DOWN*2, RIGHT+UP*2, RIGHT*5+UP, color=CYAN)
        craft = Triangle(color=AMBER, fill_opacity=.8).scale(.35).move_to(route.get_start())
        self.play(Write(title), FadeIn(subtitle)); self.play(Create(route), MoveAlongPath(craft, route), run_time=5); self.wait(1)

    def secant_to_tangent(self):
        coefficients, x0 = self.model(); axes = self.axes(coefficients, x0)
        graph = axes.plot(lambda x: self.polynomial(coefficients, x), x_range=[x0-3, x0+3], color=CYAN)
        tracker = ValueTracker(x0 + 1.8)
        a = Dot(axes.c2p(x0, self.polynomial(coefficients, x0)), color=AMBER)
        b = always_redraw(lambda: Dot(axes.c2p(tracker.get_value(), self.polynomial(coefficients, tracker.get_value())), color=VIOLET))
        secant = always_redraw(lambda: axes.get_secant_slope_group(x=x0, graph=graph, dx=tracker.get_value()-x0, secant_line_color=VIOLET, dx_line_color=CYAN, dy_line_color=AMBER))
        self.play(Create(axes), Create(graph), FadeIn(a), FadeIn(b)); self.add(secant); self.play(tracker.animate.set_value(x0 + .04), run_time=7); self.wait(1)

    def limit_definition(self):
        formula = MathTex(r"\frac{f(x+h)-f(x)}{h}", color=WHITE).scale(1.7)
        labels = VGroup(Text("vertical change", color=AMBER), Text("horizontal change", color=CYAN)).arrange(DOWN).next_to(formula, DOWN, buff=.8)
        arrow = MathTex(r"h\to0", color=CYAN).next_to(formula, RIGHT, buff=1)
        self.play(Write(formula)); self.play(FadeIn(labels, shift=UP)); self.play(Write(arrow)); self.wait(3)

    def worked_example(self):
        coefficients, point = self.model()
        slope = self.derivative(coefficients, point)
        h2 = coefficients[2] + 3 * coefficients[3] * point
        difference_coefficients = [0, slope, h2, coefficients[3]]
        quotient_coefficients = [slope, h2, coefficients[3], 0]
        function = self.polynomial_tex(coefficients)
        difference = self.polynomial_tex(difference_coefficients, "h")
        quotient = self.polynomial_tex(quotient_coefficients, "h")
        lines = VGroup(*[MathTex(text) for text in [rf"f(x)={function},\ x={point}", f"f({point}+h)-f({point})", f"={difference}", rf"\frac{{{difference}}}{{h}}={quotient}", rf"h\to0\Rightarrow f'({point})={slope}"]]).arrange(DOWN, aligned_edge=LEFT, buff=.45)
        lines[-1].set_color(AMBER)
        for line in lines: self.play(Write(line), run_time=1.2)
        self.wait(2)

    def same_value_different_slope(self):
        axes = Axes(x_range=[-1, 5, 1], y_range=[-1, 5, 1], x_length=9, y_length=5, axis_config={"color": MUTED}); first = axes.plot(lambda x: x, color=CYAN); second = axes.plot(lambda x: 2-x, color=AMBER)
        point = Dot(axes.c2p(1,1), color=VIOLET); label = Text("same value · different slopes", font_size=28).to_edge(UP)
        self.play(Create(axes), Create(first), Create(second)); self.play(FadeIn(point), Write(label)); self.wait(3)

    def algebra_repair(self):
        wrong = MathTex(r"(2+h)^2=4+h^2", color=RED).scale(1.4)
        correct = MathTex(r"(2+h)^2=4+4h+h^2", color=AMBER).scale(1.4)
        self.play(Write(wrong)); self.play(TransformMatchingTex(wrong, correct)); self.wait(3)

    def cancel_h_repair(self):
        start = MathTex(r"\frac{5h+h^2}{h}").scale(1.6); end = MathTex(r"5+h").scale(1.6).set_color(AMBER)
        warning = Text("simplify before h → 0", color=CYAN, font_size=28).next_to(start, DOWN)
        self.play(Write(start), FadeIn(warning)); self.play(TransformMatchingTex(start, end)); self.wait(3)

    def function_derivative_link(self):
        coefficients, point = self.model(); axes = self.axes(coefficients, point, include_derivative=True)
        function = axes.plot(lambda x: self.polynomial(coefficients, x), x_range=[point-3, point+3], color=CYAN)
        derivative = axes.plot(lambda x: self.derivative(coefficients, x), x_range=[point-3, point+3], color=AMBER)
        labels = VGroup(Text("f(x): state", color=CYAN), Text("f'(x): change", color=AMBER)).arrange(DOWN).to_corner(UL)
        self.play(Create(axes), Create(function), FadeIn(labels[0])); self.play(Create(derivative), FadeIn(labels[1])); self.wait(3)
