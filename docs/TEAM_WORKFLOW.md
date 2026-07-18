# Team workflow with Codex

The repository is the shared memory. A chat prompt is only the current task.

## Before starting

1. Pull the latest `main`.
2. Read `AGENTS.md`, `PRODUCT_SPEC.md`, and `PROJECT_STATE.md`.
3. Create or claim one GitHub issue with a testable outcome.
4. Create a branch or worktree named `codex/<short-task>`.

Agree on contracts before parallel implementation. For this project, `EpisodeSpec`, `StoryState`, `LearnerState`, and API request/response schemas are the boundary between generation and player work.

## Give Codex a task prompt, not the original master prompt

```text
Goal
Implement <one observable outcome>.

Repository context
Read AGENTS.md, PROJECT_STATE.md, and the relevant architecture section first.
Preserve the existing EpisodeSpec/API contracts unless this issue explicitly changes them.

Constraints
- <product invariant>
- <files or systems in scope>
- Do not rewrite unrelated working areas.

Done when
- <user-visible behavior>
- <tests/visual states>
- <documentation or handoff update>

Verification
Run <commands> and inspect <desktop/mobile/branch states>.

Handoff
Summarize changed files, decisions, remaining risks, and the next smallest issue.
```

## Before merging

1. Ask Codex to review its own diff against the issue and `PRODUCT_SPEC.md`.
2. Run the relevant automated checks.
3. Inspect user-visible states, including an error path.
4. Have the other teammate review the PR, not the chat transcript.
5. Update `PROJECT_STATE.md`; record durable tradeoffs in `docs/DECISIONS.md`.
6. Add an eval or test whenever a failure could regress silently.

## How the project grows

- Repeated AI mistake → add one small rule to `AGENTS.md`.
- Product/architecture tradeoff → add a dated entry to `docs/DECISIONS.md`.
- New stable capability or blocker → update `PROJECT_STATE.md`.
- New subject/episode → add an eval under `evals/`.
- Bug → add a focused regression test before or with the fix.

This creates improvement through evidence and shared constraints, not through an ever-longer prompt.
