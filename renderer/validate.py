from __future__ import annotations

import ast

# Model-authored scene code may only touch the animation libraries. Everything
# that could reach the filesystem, network, process table, or interpreter
# internals is rejected before the code is ever executed.
ALLOWED_IMPORT_ROOTS = {"manim", "math", "numpy"}
FORBIDDEN_CALLS = {
    "eval", "exec", "compile", "open", "input", "breakpoint",
    "getattr", "setattr", "delattr", "globals", "locals", "vars",
    "__import__", "memoryview", "help", "exit", "quit",
}
MAX_CODE_CHARS = 20_000
MAX_AST_NODES = 3_000


class SceneValidationError(Exception):
    pass


def _check_import_name(name: str) -> None:
    root = name.split(".")[0]
    if root not in ALLOWED_IMPORT_ROOTS:
        raise SceneValidationError(f"Import of '{name}' is not allowed; only manim, math, and numpy may be imported.")


def validate_scene_code(code: str) -> None:
    """Raise SceneValidationError if the code is not a safe single Manim scene."""
    if not code or not code.strip():
        raise SceneValidationError("Scene code is empty.")
    if len(code) > MAX_CODE_CHARS:
        raise SceneValidationError(f"Scene code exceeds {MAX_CODE_CHARS} characters.")

    try:
        tree = ast.parse(code)
    except SyntaxError as error:
        raise SceneValidationError(f"Scene code has a syntax error: {error.msg} (line {error.lineno}).")

    nodes = list(ast.walk(tree))
    if len(nodes) > MAX_AST_NODES:
        raise SceneValidationError("Scene code is too complex.")

    generated_scene_classes = 0
    for node in nodes:
        if isinstance(node, ast.Import):
            for alias in node.names:
                _check_import_name(alias.name)
        elif isinstance(node, ast.ImportFrom):
            _check_import_name(node.module or "")
        elif isinstance(node, (ast.Global, ast.Nonlocal)):
            raise SceneValidationError("global and nonlocal statements are not allowed.")
        elif isinstance(node, ast.Attribute):
            if node.attr.startswith("_"):
                raise SceneValidationError(f"Access to the dunder or private attribute '{node.attr}' is not allowed.")
        elif isinstance(node, ast.Name):
            if node.id.startswith("__") and node.id.endswith("__"):
                raise SceneValidationError(f"Reference to '{node.id}' is not allowed.")
            if node.id in FORBIDDEN_CALLS:
                raise SceneValidationError(f"Use of '{node.id}' is not allowed.")
        elif isinstance(node, ast.ClassDef):
            if node.name == "GeneratedScene":
                generated_scene_classes += 1
                base_names = {getattr(base, "id", getattr(base, "attr", "")) for base in node.bases}
                if "Scene" not in base_names:
                    raise SceneValidationError("class GeneratedScene must inherit from Scene.")

    if generated_scene_classes != 1:
        raise SceneValidationError("Scene code must define exactly one class named GeneratedScene(Scene).")
