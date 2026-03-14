# AI Handoff Guide

## Purpose

This document tells future AI instances how to continue work on this repo without re-deciding the product direction.

Read [the app spec](app-spec.md) before proposing implementation work.

## Current Direction

The product is a local-first macOS desktop app for coordinating `Codex CLI` and `Claude Code CLI`.

The intended first build order is:

1. local runtime
2. shared protocol and persistence model
3. verification engine
4. desktop shell

Do not jump ahead to cloud or browser surfaces.

## Non-Negotiable Constraint

Do not build any `Next.js` surface until the user explicitly says to do so.

That includes:

- `apps/web`
- remote dashboards
- docs sites
- marketing sites
- server actions
- app routes

If a task touches those areas, stop at planning or documentation unless the user has clearly approved implementation.

## Expected Working Style

When continuing the project:

- preserve the desktop-first, local-first architecture
- keep orchestration logic out of the renderer
- keep adapters focused on translation, not decision-making
- favor typed internal protocols over loose text passing
- prefer worktree isolation over shared-write workflows
- treat automated verification as more authoritative than model agreement

## Default Agent Roles

Until the user changes the product direction:

- `Claude` = planner and reviewer
- `Codex` = implementer

Do not redesign the first version around symmetrical or fully interchangeable roles unless the user asks for that change.

## Good Next Steps For Future AI Instances

Preferred work order:

1. formalize the protocol types and event model
2. define the run state machine
3. define adapter contracts for `Codex CLI` and `Claude Code CLI`
4. define persistence schema for runs, events, artifacts, and verdicts
5. scaffold the runtime package before building polished UI

## What To Avoid

- building the web app early
- mixing subprocess control into the renderer
- letting both agents write to the same working tree
- using unstructured prose as the only system contract
- depending on a backend for MVP viability

## Documentation Rule

If implementation decisions change, update the spec docs in this folder first so the next AI instance inherits the same constraints and terminology.
