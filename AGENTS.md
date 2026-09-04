---
description: |
  Shared guide for AI coding tools in this repository (Copilot, Claude Code, Cursor, etc.).
  Keep answers concise, challenge assumptions, and optimize token usage.
---

# AGENTS

This file is the baseline policy for AI coding agents in this repository.
Tool-specific add-ons should stay in that tool's own config.

**Before touching backend code, read `backend/ARCHITECTURE.md`.** It carries the layer rules,
the machine-enforced invariants (ArchUnit), the security model, and the local-run gotchas
(jenv/ryuk/Testcontainers). This policy file covers *how to work*; that one covers *how the
backend is built*.

## Operational Rules

- Do not run git write operations.
- Never run: `git add`, `git commit`, `git push`, `git merge`, `git rebase`, `git reset`.
- User always reviews and performs git actions manually.
- Keep implementation simple: YAGNI first, avoid unnecessary abstractions.
- Do not expose or log secrets (`.env`, vault content, API keys, certificates).
- Never read `.env`, `env.sh` files

## Working Rules

- Before non-trivial code changes, provide a short plan and wait for user approval.
- Exception: obvious typo or one-line trivial fix.
- Do not blindly apply user ideas if a safer or simpler standard practice exists.
- Briefly compare alternatives and tradeoffs, then implement.
- Keep names explicit; avoid unnecessary comments.
- Do not let GOD classes. Use helper classes, design patterns. Make the code always manageble and readable.
- Do not put long code comment to the code. Keep them short and brief. Avoid to have long explanations and unneccessary informations.
- Do not convert project to test garbage. Do not write test if not necessary. Check the existing test, if there is a test that you can use for the purpose, enrich it. If test not required do not create.

## Review Fix Rule (No Patch Stacking)

- When a review or user finding points at a line, do not patch only that line.
- Re-scan every entry point that shares the same work semantics and fix the
  defect class, not the single instance.
- Masking contract ambiguity with broad fallbacks or silent degradation is a
  low-quality fix and does not close a finding.
- Origin: daily_stock_analysis AGENTS.md §8.1 (adopted 2026-08-13); rationale in
  `docs/notes/2026-08-13-daily-stock-analysis-dersleri.md` §1c.

## New Class / File Threshold

Ask in this order:

1. Can the logic fit in an existing module as a private/internal function?
2. If yes, why is a new file required?
3. Is the new file independently testable, single-responsibility, and reusable from at least two call sites?

If these are not clearly true, do not add a new file.

## Design Pattern Threshold

Use Strategy/Factory/Policy-style abstractions only when:

- Real variation count is 3 or more
- Variations are expected to evolve independently


Otherwise, prefer simple functions or explicit `if/switch` flow.

## Abstraction Cost Rule

Every new layer increases maintenance cost.
Add abstraction only for concrete gain (test isolation, real reuse, or required variability control).

## Token-Efficient Workflow

- Use targeted search and read only needed ranges.
- Keep responses short and decision-oriented.
- Reject vague scope early.
- Avoid speculative long-form analysis.

Decision gate format:

```text
GATE: [Scope | Test | Impact]
Missing: [what is missing]
Next: [what user should provide]
Then: [next action]
```

## Sub-Agent and Workflow Budget

Multi-agent fan-out is a real tool, not a forbidden one. The rule is **proportion**:
use it when the work genuinely has breadth, not as a reflex on every task.
Inline (read, decide, act in the main session) is the normal mode.

## Testing Policy

- No code changes without tests (unless explicitly approved by user for exceptional cases).
- After changes, run affected package/module tests by default.
- Run full workspace build/tests only when cross-package impact exists or user asks.

## API Collection Policy

- Every new or changed HTTP endpoint MUST get a matching Bruno request in
  `backend/.infra/bumpinto-collection/`. This is part of the endpoint's definition of done,
  not a follow-up chore.
- Format is the OpenCollection spec (`opencollection.yml` at the root, requests as `*.yml`
  with `info` / `http` / `runtime` / `settings`) — NOT the legacy `bruno.json` + `.bru` layout.
- Put the request in the folder matching its controller; set `seq` so the folder reads in
  call order. Chain variables with `bru.setVar` so the collection is runnable top to bottom.
- Real secrets are never written to these files. Environment files declare them as
  `secret: true` with an empty value; the user fills them in via the Bruno UI.
- Each request carries a short `docs:` block stating auth level, validation limits and
  rate limit — the collection doubles as the hand-written API reference.

## Skills Policy

Use relevant superpowers skills proactively:

- New feature: `brainstorming`
- New ideas: `grill-me`
- Bug investigation: `systematic-debugging`
- New code: `test-driven-development`
- Plan creation: `writing-plans`
- Before completion claims: `verification-before-completion`
- Use rtk ai always for git/maven/build/npm run test/npm run build  commands

## Memory Policy

- If the same correction/rule appears a second time, propose memory capture.
- Ask user approval before writing memory.
- Save approved repository memories under `/memories/repo/memofin-[topic].md`.

## Project Pitfalls

- Do not commit secrets or decrypted vault artifacts.
