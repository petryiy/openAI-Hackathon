# Project guidance for coding agents

Read `PRODUCT_SPEC.md` and `PROJECT_STATE.md` before changing product behavior. Read `docs/ARCHITECTURE.md` before changing contracts or state flow.

## Product invariants

- This is a student-facing adaptive visual-learning drama, not a generic video generator.
- Story motivates; deterministic visualization explains; choices diagnose; adaptation selects the next representation.
- Keep `StoryState` and `LearnerState` separate.
- Preserve exactly two diagnostic choices and one unassisted transfer task in the core episode.
- Exact math, axes, geometry, scale, and numeric relationships must use deterministic SVG/Canvas/Manim output.
- Never execute model-generated Python in the Next.js process. The isolated renderer MAY execute model-authored Manim scene code, but only after `renderer/validate.py` passes it (import allowlist, no dunder access, no filesystem/OS/network) and only inside the hardened sandbox container.
- Any-topic whiteboard lessons (LessonSpec v3) are authored by the model as a constrained JSON scene DSL, validated and sanitized by code, and interpreted by a fixed browser player — the model never ships raw animation code to Track A.
- Generated content may fill approved components but may not redesign the product shell.
- The seeded Moonbase episode and the offline whiteboard fixture must work with no API keys or external services.

## Working agreement

- One issue and one owner per branch. Use `codex/<short-task>` branch names.
- Do not rewrite working areas outside the issue scope.
- Record contract/architecture decisions in `docs/DECISIONS.md`.
- Update `PROJECT_STATE.md` when a meaningful capability or blocker changes.
- When an AI mistake repeats, add the smallest durable rule here.

## Commands

```bash
pnpm install
pnpm dev
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Before handoff, run the checks proportional to the change. Product/UI changes require desktop and mobile visual inspection in addition to automated checks.

## Definition of done

- The requested flow works end to end, including empty/loading/error states.
- Core logic has focused tests.
- No secret or private learner data reaches the browser unnecessarily.
- Accessibility basics remain intact: keyboard navigation, visible focus, captions, contrast, and reduced motion.
- The README and project state are accurate.
