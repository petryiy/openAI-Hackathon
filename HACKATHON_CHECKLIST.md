# OpenAI Build Week submission checklist

## Project

- [x] Education-track product with a working end-to-end local demo
- [x] GPT-5.6 server integration present and visible in the repository
- [x] Codex used substantially for the build
- [x] Public-ready README with setup, architecture, limitations, and demo steps
- [ ] Add and live-test an `OPENAI_API_KEY`
- [ ] Rehearse the exact three-minute path in `docs/DEMO_SCRIPT.md`

## Submission assets

- [ ] Make the GitHub repository public (if not already public)
- [ ] Record a public YouTube demo under three minutes
- [ ] Include voiceover explaining the product, GPT-5.6 use, and Codex use
- [ ] Capture strong screenshots: create, confident-error remediation, recap
- [ ] Add the primary Codex task’s `/feedback` session ID
- [ ] Complete the Devpost description and Education track selection
- [ ] Verify every public link in an incognito window

## Final smoke test

- [ ] Fresh clone and `pnpm install`
- [ ] `pnpm test && pnpm typecheck && pnpm lint && pnpm build`
- [ ] Offline Moonbase path works without environment variables
- [ ] Wrong + very sure selects remediation
- [ ] Correct + very sure at the second checkpoint selects advance
- [ ] Transfer result and recap match the path taken
- [ ] 1440×900 and 390×844 screenshots have no overflow or blocked controls
- [ ] No secrets appear in Git history, browser bundles, or screenshots
