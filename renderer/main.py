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
from typing import Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict, Field

TEMPLATES = Literal[
    "derivative_story_hook", "derivative_secant_to_tangent",
    "derivative_limit_definition", "derivative_worked_example",
    "derivative_same_value_different_slope", "derivative_algebra_expansion_repair",
    "derivative_cancel_h_repair", "derivative_function_derivative_link",
]
OUTPUT_ROOT = Path(os.environ.get("RENDER_OUTPUT_ROOT", "/output")).resolve()
WORK_ROOT = Path("/work").resolve()
JOBS: dict[str, dict] = {}
LOCK = threading.Lock()
MANIM_LOCK = threading.Lock()


class PolynomialParams(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coefficients: tuple[int, int, int, int]
    evaluation_point: int = Field(ge=-6, le=6)


class RenderRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    template_id: TEMPLATES
    params: PolynomialParams
    locale: Literal["en"] = "en"
    narration: str = Field(min_length=1, max_length=1200)
    duration_ms: int = Field(ge=4_000, le=30_000)
    theme: Literal["calculus_lab"] = "calculus_lab"


app = FastAPI(title="Plot as Proof Manim Renderer", docs_url=None, redoc_url=None)


def cache_key(spec: RenderRequest) -> str:
    payload = json.dumps(spec.model_dump(), ensure_ascii=False, sort_keys=True).encode("utf-8")
    return hashlib.sha256(b"derivative-templates-v3:" + payload).hexdigest()


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
        poster_timestamp = min(target_duration * .35, target_duration - .2)
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
