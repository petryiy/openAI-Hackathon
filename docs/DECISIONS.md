# Decision log

## 2026-07-18 — Build the seeded learning loop first

We will finish the Moonbase episode, adaptation engine, exact SVG teaching visual, and recap before broad upload/media generation. This protects the product's differentiator and the three-minute demo.

## 2026-07-18 — Use a hybrid deterministic media strategy

The initial cockpit, characters, motion, and projectile visualization are web-native CSS/SVG. This makes the demo reproducible without external media providers. Generated images, TTS, and isolated Manim rendering can replace adapters later without changing the player contract.

## 2026-07-18 — Rules own branch reliability

GPT-5.6 may author validated episode content, but the runtime adaptation policy remains deterministic for the MVP. Confidence plus option correctness selects `advance`, `verify`, or `remediate`; the model is not allowed to invent a nonexistent branch.

## 2026-07-18 — API key is optional for the demo

`OPENAI_API_KEY` is intentionally unset. The server integration is present, but the Moonbase episode and its full learning loop work offline. A missing key for a new, unsupported concept produces a clear recoverable error rather than fabricated teaching content.
