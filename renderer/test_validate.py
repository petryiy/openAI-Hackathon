"""Unit tests for the Manim scene AST validator. Run with: python -m pytest renderer/test_validate.py (or python renderer/test_validate.py)."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from validate import SceneValidationError, validate_scene_code

VALID_SCENE = """
from manim import *
import numpy as np


class GeneratedScene(Scene):
    def construct(self):
        axes = Axes(x_range=[-3, 3], y_range=[0, 9])
        graph = axes.plot(lambda x: x ** 2, color=BLUE)
        label = MathTex(r"y = x^2").to_edge(UP)
        self.play(Create(axes), Create(graph), Write(label))
        self.wait(1)
"""


def expect_ok(code: str) -> None:
    validate_scene_code(code)


def expect_reject(code: str, needle: str) -> None:
    try:
        validate_scene_code(code)
    except SceneValidationError as error:
        assert needle.lower() in str(error).lower(), f"expected '{needle}' in '{error}'"
        return
    raise AssertionError(f"expected rejection containing '{needle}'")


def test_accepts_a_realistic_scene():
    expect_ok(VALID_SCENE)


def test_rejects_os_import():
    expect_reject("import os\n" + VALID_SCENE, "not allowed")


def test_rejects_from_pathlib_import():
    expect_reject("from pathlib import Path\n" + VALID_SCENE, "not allowed")


def test_rejects_open_call():
    code = VALID_SCENE.replace("self.wait(1)", "open('/etc/passwd')")
    expect_reject(code, "open")


def test_rejects_dunder_attribute_access():
    code = VALID_SCENE.replace("self.wait(1)", "self.play(Create(axes.__class__()))")
    expect_reject(code, "not allowed")


def test_rejects_getattr():
    code = VALID_SCENE.replace("self.wait(1)", "getattr(self, 'play')")
    expect_reject(code, "getattr")


def test_rejects_missing_generated_scene():
    expect_reject("from manim import *\n\nclass Other(Scene):\n    def construct(self):\n        self.wait(1)\n", "GeneratedScene")


def test_rejects_wrong_base_class():
    expect_reject("from manim import *\n\nclass GeneratedScene(object):\n    def construct(self):\n        pass\n", "inherit from Scene")


def test_rejects_syntax_error():
    expect_reject("class GeneratedScene(Scene:\n    pass", "syntax error")


if __name__ == "__main__":
    tests = [value for name, value in sorted(globals().items()) if name.startswith("test_") and callable(value)]
    failures = 0
    for test in tests:
        try:
            test()
            print(f"PASS {test.__name__}")
        except AssertionError as error:
            failures += 1
            print(f"FAIL {test.__name__}: {error}")
    print(f"\n{len(tests) - failures}/{len(tests)} passed")
    sys.exit(1 if failures else 0)
