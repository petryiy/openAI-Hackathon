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
            "derivative_rule_story_hook": self.rule_story_hook,
            "derivative_expression_structure": self.expression_structure,
            "derivative_power_sum_rule": self.symbolic_rule,
            "derivative_product_rule": self.symbolic_rule,
            "derivative_quotient_rule": self.symbolic_rule,
            "derivative_chain_rule": self.symbolic_rule,
            "derivative_standard_function_rule": self.symbolic_rule,
            "derivative_rule_worked_example": self.symbolic_worked_example,
            "derivative_rule_summary": self.symbolic_summary,
            "derivative_missing_inner_repair": self.symbolic_repair,
            "derivative_product_repair": self.symbolic_repair,
            "derivative_quotient_repair": self.symbolic_repair,
            "derivative_standard_function_repair": self.symbolic_repair,
        }
        if template not in handlers:
            raise ValueError("Unknown template")
        handlers[template]()

    def model(self):
        params = spec()["params"]
        return params["coefficients"], params["evaluation_point"]

    def symbolic_model(self):
        params = spec()["params"]
        if params.get("kind") != "symbolic":
            raise ValueError("Symbolic template requires validated symbolic params")
        return params["expression_ast"], params["derivative_ast"], params["capability"]

    def is_seed_chain(self, source):
        return (
            source.get("type") == "power" and source.get("exponent") == 3
            and source.get("base", {}).get("type") == "add"
        )

    @classmethod
    def ast_tex(cls, node):
        kind = node["type"]
        if kind == "rational":
            return str(node["numerator"]) if node["denominator"] == 1 else rf"\frac{{{node['numerator']}}}{{{node['denominator']}}}"
        if kind == "variable": return "x"
        if kind == "function":
            name = "\\ln" if node["name"] == "ln" else rf"\{node['name']}"
            return rf"{name}\left({cls.ast_tex(node['argument'])}\right)"
        if kind == "power": return rf"\left({cls.ast_tex(node['base'])}\right)^{{{node['exponent']}}}"
        if kind == "divide": return rf"\frac{{{cls.ast_tex(node['numerator'])}}}{{{cls.ast_tex(node['denominator'])}}}"
        if kind == "multiply": return r"\,".join(cls.ast_tex(item) for item in node["factors"])
        return " + ".join(cls.ast_tex(item) for item in node["terms"])

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

    def rule_story_hook(self):
        source, _, capability = self.symbolic_model()
        if capability == "chain" and self.is_seed_chain(source):
            return self.chain_story_hook()
        title = Text("STRUCTURE CONTROLS CHANGE", color=CYAN, font_size=38)
        formula = MathTex(rf"f(x)={self.ast_tex(source)}", color=WHITE).scale(1.25).next_to(title, DOWN, buff=.75)
        rule = Text(capability.replace("_", " ").upper(), color=AMBER, font_size=26).next_to(formula, DOWN, buff=.65)
        self.play(Write(title)); self.play(Write(formula)); self.play(FadeIn(rule, shift=UP)); self.wait(2)

    def expression_structure(self):
        source, _, capability = self.symbolic_model()
        if capability == "chain" and self.is_seed_chain(source):
            return self.chain_expression_structure()
        formula = MathTex(self.ast_tex(source), color=WHITE).scale(1.55)
        box = SurroundingRectangle(formula, color=CYAN, buff=.35, corner_radius=.18)
        label = Text(f"outer structure → {capability.replace('_', ' ')}", color=AMBER, font_size=28).next_to(box, DOWN, buff=.8)
        self.play(Write(formula)); self.play(Create(box)); self.play(FadeIn(label, shift=UP)); self.wait(3)

    def symbolic_rule(self):
        source, derivative, capability = self.symbolic_model()
        if capability == "chain" and self.is_seed_chain(source):
            return self.chain_rule()
        heading = Text(capability.replace("_", " ").upper(), color=CYAN, font_size=34).to_edge(UP)
        before = MathTex(rf"f(x)={self.ast_tex(source)}").scale(1.25)
        arrow = Arrow(LEFT, RIGHT, color=VIOLET).next_to(before, DOWN, buff=.65)
        after = MathTex(rf"f'(x)={self.ast_tex(derivative)}", color=AMBER).scale(1.25).next_to(arrow, DOWN, buff=.65)
        self.play(Write(heading), Write(before)); self.play(GrowArrow(arrow)); self.play(Write(after)); self.wait(3)

    def symbolic_worked_example(self):
        source, derivative, capability = self.symbolic_model()
        if capability == "chain" and self.is_seed_chain(source):
            return self.chain_worked_example()
        lines = VGroup(
            MathTex(rf"f(x)={self.ast_tex(source)}"),
            Text(f"identify: {capability.replace('_', ' ')}", color=CYAN, font_size=28),
            Text("differentiate parts → assemble → simplify", color=MUTED, font_size=25),
            MathTex(rf"f'(x)={self.ast_tex(derivative)}", color=AMBER),
        ).arrange(DOWN, aligned_edge=LEFT, buff=.65)
        for line in lines: self.play(Write(line), run_time=1.2)
        self.wait(2)

    def symbolic_summary(self):
        source, derivative, capability = self.symbolic_model()
        if capability == "chain" and self.is_seed_chain(source):
            return self.chain_summary()
        steps = VGroup(*[Text(text, font_size=28, color=color) for text, color in [
            ("1  READ STRUCTURE", CYAN), ("2  DIFFERENTIATE PARTS", WHITE),
            ("3  ASSEMBLE THE RULE", VIOLET), ("4  SIMPLIFY", AMBER),
        ]]).arrange(DOWN, aligned_edge=LEFT, buff=.5)
        result = MathTex(rf"f'(x)={self.ast_tex(derivative)}", color=AMBER).next_to(steps, DOWN, buff=.75)
        self.play(LaggedStart(*[FadeIn(item, shift=RIGHT) for item in steps], lag_ratio=.25)); self.play(Write(result)); self.wait(2)

    def symbolic_repair(self):
        source, derivative, capability = self.symbolic_model()
        if capability == "chain" and self.is_seed_chain(source):
            return self.chain_repair()
        wrong = Text("COMMON SHORTCUT", color=RED, font_size=28)
        warning = Text(f"repair the {capability.replace('_', ' ')}", color=CYAN, font_size=30).next_to(wrong, DOWN, buff=.65)
        source_formula = MathTex(self.ast_tex(source)).next_to(warning, DOWN, buff=.6)
        result = MathTex(rf"f'(x)={self.ast_tex(derivative)}", color=AMBER).next_to(source_formula, DOWN, buff=.7)
        self.play(Write(wrong)); self.play(Transform(wrong, warning)); self.play(Write(source_formula)); self.play(Write(result)); self.wait(2)

    def chain_story_hook(self):
        title = Text("TRACE THE SIGNAL", color=CYAN, font_size=38).to_edge(UP)
        subtitle = Text("one input  /  two transformations  /  one final rate", color=MUTED, font_size=22).next_to(title, DOWN, buff=.22)
        input_node = Circle(radius=.62, color=CYAN, fill_color="#101D2E", fill_opacity=.9).shift(LEFT * 5)
        input_label = MathTex("x", color=CYAN).scale(1.15).move_to(input_node)
        inner_gate = RoundedRectangle(width=3.05, height=2.05, corner_radius=.18, color=CYAN, fill_color="#0C1828", fill_opacity=.92).shift(LEFT * 1.9)
        inner_title = Text("INNER TRANSFORM", color=CYAN, font_size=19).next_to(inner_gate.get_top(), DOWN, buff=.22)
        inner_formula = MathTex("u=x^2+1", color=WHITE).scale(.9).move_to(inner_gate).shift(DOWN * .18)
        outer_gate = RoundedRectangle(width=3.05, height=2.05, corner_radius=.18, color=VIOLET, fill_color="#171229", fill_opacity=.92).shift(RIGHT * 1.9)
        outer_title = Text("OUTER TRANSFORM", color=VIOLET, font_size=19).next_to(outer_gate.get_top(), DOWN, buff=.22)
        outer_formula = MathTex("y=u^3", color=WHITE).scale(.9).move_to(outer_gate).shift(DOWN * .18)
        output_node = Circle(radius=.62, color=AMBER, fill_color="#2A2010", fill_opacity=.9).shift(RIGHT * 5)
        output_label = MathTex("y", color=AMBER).scale(1.15).move_to(output_node)
        route = Line(input_node.get_right(), output_node.get_left(), color=MUTED, stroke_opacity=.45)
        pulse = Dot(input_node.get_center(), radius=.12, color=AMBER)
        self.play(Write(title), FadeIn(subtitle))
        self.play(Create(route), FadeIn(input_node), Write(input_label))
        self.play(FadeIn(inner_gate), Write(inner_title), Write(inner_formula), run_time=1.3)
        self.play(FadeIn(outer_gate), Write(outer_title), Write(outer_formula), run_time=1.3)
        self.play(FadeIn(output_node), Write(output_label))
        self.play(FadeIn(pulse)); self.play(pulse.animate.move_to(inner_gate.get_center()), Flash(inner_gate, color=CYAN), run_time=1.5)
        self.play(pulse.animate.move_to(outer_gate.get_center()), Flash(outer_gate, color=VIOLET), run_time=1.5)
        self.play(pulse.animate.move_to(output_node.get_center()), Flash(output_node, color=AMBER), run_time=1.5)
        self.wait(1)

    def chain_expression_structure(self):
        heading = Text("READ OUTSIDE IN", color=CYAN, font_size=36).to_edge(UP)
        formula = MathTex(r"f(x)=\left(x^2+1\right)^3", color=WHITE).scale(1.35).shift(UP * .75)
        outer_box = SurroundingRectangle(formula, color=VIOLET, buff=.28, corner_radius=.18)
        outer_label = Text("OUTER: cube the input", color=VIOLET, font_size=25).next_to(outer_box, UP, buff=.28)
        inner = MathTex(r"u=x^2+1", color=CYAN).scale(1.2).shift(DOWN * 1.15 + LEFT * 2.25)
        outer = MathTex(r"f=u^3", color=VIOLET).scale(1.2).shift(DOWN * 1.15 + RIGHT * 2.25)
        bridge = Arrow(inner.get_right(), outer.get_left(), color=AMBER, buff=.22)
        inner_label = Text("INNER SIGNAL", color=CYAN, font_size=18).next_to(inner, DOWN, buff=.25)
        outer_small = Text("OUTER MACHINE", color=VIOLET, font_size=18).next_to(outer, DOWN, buff=.25)
        self.play(Write(heading)); self.play(Write(formula), run_time=1.4)
        self.play(Create(outer_box), FadeIn(outer_label, shift=DOWN))
        self.play(TransformFromCopy(formula, inner), FadeIn(inner_label))
        self.play(GrowArrow(bridge), TransformFromCopy(formula, outer), FadeIn(outer_small))
        self.play(Indicate(inner, color=CYAN), Indicate(outer, color=VIOLET)); self.wait(2)

    def chain_rule(self):
        heading = Text("CHAIN RULE // LINK THE RATES", color=CYAN, font_size=34).to_edge(UP)
        master = MathTex(r"\frac{dy}{dx}=\frac{dy}{du}\cdot\frac{du}{dx}", color=WHITE).scale(1.25).shift(UP * 1.55)
        outer_card = RoundedRectangle(width=4.2, height=1.65, corner_radius=.18, color=VIOLET, fill_color="#171229", fill_opacity=.85).shift(LEFT * 2.5 + DOWN * .15)
        inner_card = RoundedRectangle(width=4.2, height=1.65, corner_radius=.18, color=CYAN, fill_color="#0C1828", fill_opacity=.85).shift(RIGHT * 2.5 + DOWN * .15)
        outer_formula = MathTex(r"\frac{dy}{du}=3u^2", color=VIOLET).move_to(outer_card)
        inner_formula = MathTex(r"\frac{du}{dx}=2x", color=CYAN).move_to(inner_card)
        link = MathTex(r"3\left(x^2+1\right)^2\cdot 2x", color=WHITE).scale(1.08).shift(DOWN * 1.65)
        result = MathTex(r"f'(x)=6x\left(x^2+1\right)^2", color=AMBER).scale(1.2).shift(DOWN * 2.65)
        self.play(Write(heading), Write(master))
        self.play(FadeIn(outer_card), Write(outer_formula)); self.play(FadeIn(inner_card), Write(inner_formula))
        self.play(Circumscribe(inner_formula, color=AMBER), run_time=1.1)
        self.play(TransformFromCopy(VGroup(outer_formula, inner_formula), link), run_time=1.5)
        self.play(TransformFromCopy(link, result), Flash(result, color=AMBER), run_time=1.5); self.wait(2)

    def chain_worked_example(self):
        heading = Text("ASSEMBLE THE DERIVATIVE", color=CYAN, font_size=34).to_edge(UP)
        rail = Line(LEFT * 5.2, RIGHT * 5.2, color=MUTED, stroke_opacity=.35).shift(UP * 1.25)
        labels = ["NAME", "OUTER RATE", "INNER RATE", "ASSEMBLE"]
        formulas = [r"u=x^2+1", r"3u^2", r"2x", r"3u^2\cdot2x"]
        colors = [CYAN, VIOLET, CYAN, AMBER]
        nodes = VGroup()
        for index, (label, formula, color) in enumerate(zip(labels, formulas, colors)):
            x = -4.5 + index * 3
            dot = Dot([x, 1.25, 0], color=color, radius=.11)
            tag = Text(label, color=color, font_size=17).next_to(dot, UP, buff=.25)
            math = MathTex(formula, color=WHITE).scale(.78).next_to(dot, DOWN, buff=.35)
            nodes.add(VGroup(dot, tag, math))
        substitute = MathTex(r"3\left(x^2+1\right)^2\cdot2x", color=WHITE).scale(1.05).shift(DOWN * 1.1)
        result = MathTex(r"\boxed{f'(x)=6x\left(x^2+1\right)^2}", color=AMBER).scale(1.15).shift(DOWN * 2.25)
        self.play(Write(heading), Create(rail))
        for node in nodes:
            self.play(FadeIn(node[0], scale=.5), Write(node[1]), Write(node[2]), run_time=.85)
        self.play(TransformFromCopy(nodes[-1][2], substitute), run_time=1.25)
        self.play(TransformMatchingTex(substitute.copy(), result), run_time=1.5)
        self.play(Flash(result, color=AMBER)); self.wait(2)

    def chain_summary(self):
        heading = Text("THE COMPOSITION PROTOCOL", color=CYAN, font_size=34).to_edge(UP)
        steps = [
            ("01", "IDENTIFY", "outside in", CYAN),
            ("02", "DIFFERENTIATE", "outer layer", VIOLET),
            ("03", "PRESERVE", "inner expression", WHITE),
            ("04", "MULTIPLY", "inner rate", AMBER),
        ]
        cards = VGroup()
        for number, title, note, color in steps:
            card = RoundedRectangle(width=2.7, height=1.65, corner_radius=.16, color=color, fill_color="#0C1220", fill_opacity=.9)
            number_text = Text(number, color=color, font_size=18).move_to(card.get_corner(UL) + RIGHT * .38 + DOWN * .28)
            title_text = Text(title, color=WHITE, font_size=19).move_to(card).shift(UP * .12)
            note_text = Text(note, color=MUTED, font_size=16).next_to(title_text, DOWN, buff=.18)
            cards.add(VGroup(card, number_text, title_text, note_text))
        cards.arrange(RIGHT, buff=.22).shift(UP * .45)
        result = MathTex(r"f'(x)=6x\left(x^2+1\right)^2", color=AMBER).scale(1.25).shift(DOWN * 1.75)
        reminder = Text("Never lose the inner derivative.", color=CYAN, font_size=22).next_to(result, DOWN, buff=.4)
        self.play(Write(heading))
        self.play(LaggedStart(*[FadeIn(card, shift=UP * .3) for card in cards], lag_ratio=.2), run_time=2.5)
        self.play(Write(result)); self.play(FadeIn(reminder, shift=UP), Flash(result, color=AMBER)); self.wait(2)

    def chain_repair(self):
        heading = Text("RESTORE THE MISSING LINK", color=CYAN, font_size=34).to_edge(UP)
        wrong = MathTex(r"f'(x)=3\left(x^2+1\right)^2", color=RED).scale(1.15).shift(UP * .8)
        missing = Text("INNER RATE MISSING", color=RED, font_size=21).next_to(wrong, DOWN, buff=.35)
        factor = MathTex(r"\times\,2x", color=CYAN).scale(1.25).shift(DOWN * .6)
        correct = MathTex(r"f'(x)=6x\left(x^2+1\right)^2", color=AMBER).scale(1.2).shift(DOWN * 1.8)
        self.play(Write(heading), Write(wrong)); self.play(FadeIn(missing, shift=UP))
        self.play(Wiggle(wrong), run_time=1.2); self.play(Write(factor), Flash(factor, color=CYAN))
        self.play(TransformFromCopy(VGroup(wrong, factor), correct), run_time=1.5)
        self.play(FadeOut(missing), Circumscribe(correct, color=AMBER)); self.wait(2)
