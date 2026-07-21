# OpenAI Build Week submission checklist

## Project

- [x] Education-track product with a working end-to-end local demo
- [x] GPT-5.6 server integration present and visible in the repository
- [x] Codex used substantially for the build
- [x] Public-ready README with setup, architecture, limitations, and demo steps
- [x] Verify a local `OPENAI_API_KEY` reaches OpenAI and classify its quota response
- [ ] Complete and record one successful primary lesson generation with `OPENAI_MODEL=gpt-5.6`
- [ ] Rehearse the exact three-minute path in `docs/DEMO_SCRIPT.md`

## Submission assets

- [x] Prepare copy-ready Aha title, elevator pitch, About story, Built with list, and GPT-5.6/Codex disclosure
- [ ] Make the GitHub repository public (if not already public)
- [ ] Record a public YouTube demo under three minutes
- [ ] Include voiceover explaining the product, GPT-5.6 use, and Codex use
- [ ] Capture strong screenshots: Knowledge Portal, generation progress, visual lesson, missing-inner repair, and recap
- [ ] Add the primary Codex task’s `/feedback` session ID
- [ ] Complete the Devpost description and Education track selection
- [ ] Verify every public link in an incognito window

## Final smoke test

- [ ] Fresh clone and `pnpm install`
- [x] `pnpm test && pnpm typecheck && pnpm lint && pnpm build`
- [ ] Offline seeded calculus lesson works without environment variables
- [x] Wrong first diagnostic selects rule-specific remediation without a confidence prompt
- [x] Repeated missing-inner-derivative input requires the smaller repair check
- [x] Transfer result and recap match the path taken
- [x] Desktop and 390×844 screenshots have no overflow or blocked controls
- [ ] No secrets appear in Git history, browser bundles, or screenshots
