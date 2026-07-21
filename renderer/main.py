from __future__ import annotations

import hashlib
import json
import os
import shutil
import subprocess
import threading
import time
import uuid
from pathlib import Path
from typing import Annotated, Literal, Union

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict, Field
import sympy as sp

TEMPLATES = Literal[
    "derivative_story_hook", "derivative_secant_to_tangent",
    "derivative_limit_definition", "derivative_worked_example",
    "derivative_same_value_different_slope", "derivative_algebra_expansion_repair",
    "derivative_cancel_h_repair", "derivative_function_derivative_link",
    "derivative_rule_story_hook", "derivative_expression_structure",
    "derivative_power_sum_rule", "derivative_product_rule", "derivative_quotient_rule",
    "derivative_chain_rule", "derivative_standard_function_rule",
    "derivative_rule_worked_example", "derivative_rule_summary",
    "derivative_missing_inner_repair", "derivative_product_repair",
    "derivative_quotient_repair", "derivative_standard_function_repair",
]
OUTPUT_ROOT = Path(os.environ.get("RENDER_OUTPUT_ROOT", "/output")).resolve()
WORK_ROOT = Path("/work").resolve()
JOBS: dict[str, dict] = {}
LOCK = threading.Lock()
MANIM_LOCK = threading.Lock()


class PolynomialParams(BaseModel):
    model_config = ConfigDict(extra="forbid")
    kind: Literal["polynomial"] = "polynomial"
    coefficients: tuple[int, int, int, int]
    evaluation_point: int = Field(ge=-6, le=6)


class RationalNode(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["rational"]
    numerator: int = Field(ge=-10_000, le=10_000)
    denominator: int = Field(ge=1, le=10_000)


class VariableNode(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["variable"]
    name: Literal["x"]


class AddNode(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["add"]
    terms: list["AstNode"] = Field(min_length=2, max_length=8)


class MultiplyNode(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["multiply"]
    factors: list["AstNode"] = Field(min_length=2, max_length=8)


class DivideNode(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["divide"]
    numerator: "AstNode"
    denominator: "AstNode"


class PowerNode(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["power"]
    base: "AstNode"
    exponent: int = Field(ge=0, le=6)


class FunctionNode(BaseModel):
    model_config = ConfigDict(extra="forbid")
    type: Literal["function"]
    name: Literal["sin", "cos", "exp", "ln"]
    argument: "AstNode"


AstNode = Annotated[Union[RationalNode, VariableNode, AddNode, MultiplyNode, DivideNode, PowerNode, FunctionNode], Field(discriminator="type")]


class SymbolicParams(BaseModel):
    model_config = ConfigDict(extra="forbid")
    kind: Literal["symbolic"]
    expression_ast: AstNode
    derivative_ast: AstNode
    capability: Literal["power", "sum", "product", "quotient", "chain", "standard_function"]
    evaluation_point: int | None = Field(default=None, ge=-6, le=6)


class MathAnalyzeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    expression_ast: AstNode
    expected_derivative_ast: AstNode | None = None
    task: Literal["differentiate", "slope_at_point"] = "differentiate"
    evaluation_point: int | None = Field(default=None, ge=-6, le=6)


for _model in (AddNode, MultiplyNode, DivideNode, PowerNode, FunctionNode, SymbolicParams, MathAnalyzeRequest):
    _model.model_rebuild(_types_namespace={"AstNode": AstNode})


class RenderRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    template_id: TEMPLATES
    params: Annotated[Union[PolynomialParams, SymbolicParams], Field(discriminator="kind")]
    locale: Literal["en"] = "en"
    narration: str = Field(min_length=1, max_length=1200)
    duration_ms: int = Field(ge=4_000, le=30_000)
    theme: Literal["calculus_lab"] = "calculus_lab"


app = FastAPI(title="Plot as Proof Manim Renderer", docs_url=None, redoc_url=None)


X = sp.Symbol("x", real=True)


def ast_to_sympy(node: AstNode):
    if isinstance(node, RationalNode):
        return sp.Rational(node.numerator, node.denominator)
    if isinstance(node, VariableNode):
        return X
    if isinstance(node, AddNode):
        return sp.Add(*(ast_to_sympy(term) for term in node.terms))
    if isinstance(node, MultiplyNode):
        return sp.Mul(*(ast_to_sympy(factor) for factor in node.factors))
    if isinstance(node, DivideNode):
        return ast_to_sympy(node.numerator) / ast_to_sympy(node.denominator)
    if isinstance(node, PowerNode):
        return ast_to_sympy(node.base) ** node.exponent
    argument = ast_to_sympy(node.argument)
    return {"sin": sp.sin, "cos": sp.cos, "exp": sp.exp, "ln": sp.log}[node.name](argument)


def sympy_to_ast(value):
    value = sp.factor(value)
    if value.is_Integer:
        return {"type": "rational", "numerator": int(value), "denominator": 1}
    if value.is_Rational:
        return {"type": "rational", "numerator": int(value.p), "denominator": int(value.q)}
    if value == X:
        return {"type": "variable", "name": "x"}
    if value.func in (sp.sin, sp.cos, sp.exp, sp.log):
        return {"type": "function", "name": "ln" if value.func == sp.log else value.func.__name__, "argument": sympy_to_ast(value.args[0])}
    if value.is_Add:
        return {"type": "add", "terms": [sympy_to_ast(item) for item in value.as_ordered_terms()]}
    if value.is_Mul:
        return {"type": "multiply", "factors": [sympy_to_ast(item) for item in value.as_ordered_factors()]}
    if value.is_Pow and value.exp.is_Integer:
        exponent = int(value.exp)
        if exponent < 0:
            positive = {"type": "power", "base": sympy_to_ast(value.base), "exponent": -exponent}
            return {"type": "divide", "numerator": {"type": "rational", "numerator": 1, "denominator": 1}, "denominator": positive}
        return {"type": "power", "base": sympy_to_ast(value.base), "exponent": exponent}
    raise ValueError(f"Unsupported symbolic result: {value.func}")


def capability_for(node: AstNode):
    if isinstance(node, DivideNode): return "quotient"
    if isinstance(node, MultiplyNode): return "product"
    if isinstance(node, PowerNode) and not isinstance(node.base, VariableNode): return "chain"
    if isinstance(node, FunctionNode): return "standard_function" if isinstance(node.argument, VariableNode) else "chain"
    if isinstance(node, AddNode): return "sum"
    return "power"


@app.post("/v1/math/analyze")
def analyze_math(spec: MathAnalyzeRequest):
    expression = ast_to_sympy(spec.expression_ast)
    derivative = sp.factor(sp.diff(expression, X))
    result = {"derivative_ast": sympy_to_ast(derivative), "capability": capability_for(spec.expression_ast), "derivative_text": str(derivative)}
    if spec.expected_derivative_ast is not None:
        result["expected_matches"] = sp.simplify(derivative - ast_to_sympy(spec.expected_derivative_ast)) == 0
    if spec.task == "slope_at_point":
        if spec.evaluation_point is None:
            raise HTTPException(status_code=422, detail="evaluation_point is required")
        value = derivative.subs(X, spec.evaluation_point)
        if value.has(sp.zoo, sp.oo, -sp.oo, sp.nan):
            raise HTTPException(status_code=422, detail="The derivative is not defined at that point")
        result["slope"] = str(value)
    return result


def cache_key(spec: RenderRequest) -> str:
    payload = json.dumps(spec.model_dump(), ensure_ascii=False, sort_keys=True).encode("utf-8")
    return hashlib.sha256(b"derivative-templates-v5:" + payload).hexdigest()


def write_vtt(path: Path, text: str, duration_ms: int) -> None:
    seconds = duration_ms / 1000
    path.write_text(f"WEBVTT\n\n00:00:00.000 --> 00:00:{seconds:06.3f}\n{text}\n", encoding="utf-8")


def render(job_id: str, spec: RenderRequest, key: str) -> None:
    output_dir = OUTPUT_ROOT / key
    work_dir = WORK_ROOT / job_id
    try:
        output_dir.mkdir(parents=True, exist_ok=True)
        work_dir.mkdir(parents=True, exist_ok=True)
        manifest_path = output_dir / "manifest.json"
        if manifest_path.exists():
            with LOCK:
                JOBS[job_id] = {"id": job_id, "status": "complete", "cached": True, **json.loads(manifest_path.read_text())}
            return
        spec_path = work_dir / "spec.json"
        spec_path.write_text(spec.model_dump_json(), encoding="utf-8")
        environment = {"PATH": os.environ.get("PATH", ""), "HOME": "/tmp", "RENDER_SPEC_PATH": str(spec_path), "RENDER_OUTPUT_DIR": str(output_dir)}
        command = ["manim", "-qm", "--format=mp4", "--media_dir", str(work_dir / "media"), "/renderer/scene.py", "GeneratedLessonScene"]
        with MANIM_LOCK:
            subprocess.run(command, check=True, timeout=90, env=environment, cwd="/renderer", capture_output=True, text=True)
        generated = next((work_dir / "media").rglob("GeneratedLessonScene.mp4"))
        raw_video = output_dir / "raw.mp4"
        shutil.copyfile(generated, raw_video)
        video = output_dir / "lesson.mp4"
        probe = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(raw_video)], check=True, timeout=10, env=environment, capture_output=True, text=True)
        source_duration = max(.1, float(probe.stdout.strip()))
        target_duration = spec.duration_ms / 1000
        timing_scale = target_duration / source_duration
        subprocess.run(["ffmpeg", "-y", "-i", str(raw_video), "-vf", f"setpts={timing_scale:.8f}*PTS", "-t", f"{target_duration:.3f}", "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(video)], check=True, timeout=30, env=environment, capture_output=True)
        raw_video.unlink(missing_ok=True)
        if video.stat().st_size > 80 * 1024 * 1024:
            raise OSError("Rendered video exceeds the 80 MB asset limit")
        poster = output_dir / "poster.png"
        poster_timestamp = min(target_duration * .82, target_duration - .2)
        subprocess.run(["ffmpeg", "-y", "-ss", f"{poster_timestamp:.3f}", "-i", str(video), "-frames:v", "1", str(poster)], check=True, timeout=20, env=environment, capture_output=True)
        captions = output_dir / "captions.vtt"
        write_vtt(captions, spec.narration, spec.duration_ms)
        checksum = hashlib.sha256(video.read_bytes()).hexdigest()
        manifest = {"videoUrl": f"/lesson-assets/{key}/lesson.mp4", "posterUrl": f"/lesson-assets/{key}/poster.png", "captionsUrl": f"/lesson-assets/{key}/captions.vtt", "durationMs": spec.duration_ms, "checksum": checksum, "renderMode": "manim"}
        manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
        with LOCK:
            JOBS[job_id] = {"id": job_id, "status": "complete", "cached": False, **manifest}
    except (subprocess.SubprocessError, StopIteration, OSError, ValueError) as error:
        with LOCK:
            JOBS[job_id] = {"id": job_id, "status": "error", "error": {"code": "RENDER_FAILED", "message": str(error)[:500], "recoverable": True}}


@app.post("/v1/renders", status_code=202)
def create_render(spec: RenderRequest):
    job_id = str(uuid.uuid4())
    key = cache_key(spec)
    with LOCK:
        JOBS[job_id] = {"id": job_id, "status": "processing", "createdAt": time.time(), "cacheKey": key}
    threading.Thread(target=render, args=(job_id, spec, key), daemon=True).start()
    return JOBS[job_id]


@app.get("/v1/renders/{render_id}")
def read_render(render_id: str):
    with LOCK:
        job = JOBS.get(render_id)
    if not job:
        raise HTTPException(status_code=404, detail="Render job not found")
    return job
