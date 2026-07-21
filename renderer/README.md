# Isolated Manim renderer

Build and run locally:

```bash
docker build -t plot-as-proof-renderer renderer
docker run --rm --name plot-proof-renderer --read-only --tmpfs /tmp:rw,uid=1000,gid=1000,size=128m --tmpfs /work:rw,uid=1000,gid=1000,size=512m \
  --cap-drop ALL --pids-limit 128 --memory 1g --cpus 1.5 -v "$PWD/.data/lesson-assets:/output" \
  -p 127.0.0.1:8787:8000 plot-as-proof-renderer
```

The published port is for host-based local development. In deployment, connect the web worker and renderer through an internal container network and do not publish port 8000.

The service accepts only the twenty-one allowlisted derivative templates and validated polynomial or symbolic AST parameters. `/v1/math/analyze` independently differentiates the AST with SymPy and can verify the code-owned expected derivative. Neither endpoint accepts raw Python, LaTeX, filesystem paths, expressions for `sympify`, or shell arguments. The web app keeps a deterministic SVG fallback when this optional worker is unavailable.
