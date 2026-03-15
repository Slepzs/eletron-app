# Autonomous Operation Guide

## Purpose

This document tells any AI agent how to work continuously on this project without waiting for human input. It is the operating procedure for unattended sessions where the user is away.

Read this alongside [the delivery plan](multi-agent-delivery-plan.md) and the [AI handoff guide](ai-handoff.md).

---

## Heartbeat Loop

An agent running autonomously must follow this loop without interruption:

```
1. Restore context
   - Run: git log --oneline -20
   - Find the last commit that starts with "heartbeat:"
   - Identify which phase was last completed

2. Identify next work
   - Open docs/multi-agent-delivery-plan.md
   - Find the lowest-numbered phase not yet marked complete in git history
   - Read the phase goal, ownership scope, done criteria, and short prompt

3. Implement the phase
   - Use the short prompt from the delivery plan as your starting instruction
   - Stay within the owned file scope for that phase
   - Reuse existing types and contracts before creating new ones
   - Fix all typecheck and lint errors before committing

4. Commit
   - Stage only files within the owned scope for the phase
   - Use this commit message format:
     heartbeat: complete phase N — <one-line description>

5. Continue
   - Move immediately to the next phase
   - Do not wait for user input unless a blocking condition is met (see below)

6. Repeat until all phases are done
```

---

## When To Pause And Wait For Human Input

Stop the heartbeat loop and leave a clear message for the user only in these cases:

- A phase requires something that is explicitly constrained (e.g. building a Next.js surface)
- A merge conflict cannot be resolved by reading the surrounding code intent
- Two consecutive attempts at the same phase both fail `bun run typecheck` and `bun run lint`
- A required external credential, API key, or environment variable is missing and cannot be inferred
- The delivery plan itself is ambiguous about what a phase requires and the ambiguity blocks progress

When pausing, commit any partial work with message:

```
heartbeat: paused at phase N — <reason for pause>
```

---

## Resumption Protocol

When starting a new session in this repo, always check whether unattended work was in progress before asking the user what to do:

```
1. Run: git log --oneline -20
2. Find the most recent "heartbeat:" commit
3. If it says "complete phase N" → continue from phase N+1
4. If it says "paused at phase N" → read the reason, resolve it if possible, then continue
5. If there are no heartbeat commits → start from the lowest incomplete phase
```

Never ask "what were we working on?" — the git log is the source of truth for heartbeat state.

---

## Phase Status Reference

This table mirrors the delivery plan. Agents update status via commit messages, not by editing this file.

| Phase | Description | Owned Scope |
|---|---|---|
| 0 | Contract lock — protocol, agent-sdk, orchestration contracts | `packages/protocol`, `packages/agent-sdk`, `packages/orchestration` |
| 1 | Verification engine | `packages/verification` |
| 2 | Git worktree isolation | `packages/git` |
| 3 | Persistence model and repositories | `packages/db` |
| 4 | Claude adapter | `packages/agent-claude` |
| 5 | Codex adapter | `packages/agent-codex` |
| 6 | Orchestration runtime | `packages/orchestration` |
| 7 | Desktop main and preload wiring | `apps/desktop/src/main`, `apps/desktop/src/preload`, `apps/desktop/src/shared` |
| 8 | Desktop renderer and UI | `apps/desktop/src/renderer`, `packages/ui` |

To check which phases are complete, run:

```
git log --oneline --grep="heartbeat: complete"
```

---

## Quality Gates Per Phase

Before committing a phase complete, every phase must pass:

```
bun run typecheck
bun run lint
```

Fix all errors before committing. Do not skip these checks. Do not use `--no-verify`.

---

## Constraints That Always Apply

These constraints hold throughout every unattended session, regardless of phase:

- Do not build any Next.js surface, web app, or remote dashboard
- Keep orchestration logic out of the renderer
- Treat `@iamrobot/protocol` as the source of truth for shared domain types
- Treat `@iamrobot/agent-sdk` as the source of truth for adapter contracts
- Do not revert or overwrite unrelated work from other agents or phases
- Do not push to remote unless the user explicitly instructed it before stepping away

---

## Related Documents

- [Multi-agent delivery plan](multi-agent-delivery-plan.md) — phase definitions, short prompts, ownership matrix
- [AI handoff guide](ai-handoff.md) — product direction and architectural constraints
- [App spec](app-spec.md) — product requirements
- [Architecture overview](architecture.md) — system design and package responsibilities
