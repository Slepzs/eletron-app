# Multi-Agent Delivery Plan

This document explains how to split implementation work across multiple AI agents without causing ownership confusion, type drift, or file conflicts.

Use this document when delegating work with prompts like:

- `Start working on Phase 1`
- `Start working on Phase 4`
- `Finish Phase 6`

## Purpose

The project should be implemented as a set of package-scoped workstreams with clear ownership.

The goal is to let multiple agents work in parallel while keeping:

- `packages/protocol` as the source of truth for shared types
- `packages/agent-sdk` as the source of truth for adapter contracts
- orchestration logic out of the renderer
- worktree isolation as the concurrency model

## Global Rules For Every Agent

Every agent working from this plan must follow these rules:

1. Reuse existing types before creating new ones.
2. Do not redefine protocol entities locally if they already exist in `@iamrobot/protocol`.
3. Do not move subprocess control, orchestration, or verification into the renderer.
4. Do not build any `Next.js` surface or web app unless the user explicitly approves it.
5. Keep changes scoped to the owned files for the assigned phase.
6. Do not revert or rewrite unrelated work from other agents.
7. Prefer adding small exports and integration seams over introducing duplicate abstractions.
8. When a phase depends on another phase, consume the exported contract instead of redefining it.

## Phase Model

There is one blocking contract phase and then multiple implementation phases that can run in parallel.

### Phase 0: Contract Lock

This phase should be assigned to a single agent first.

Goal:

- finalize the shared protocol, event model, runtime inputs and outputs, and adapter contract boundaries

Primary ownership:

- `packages/protocol/**`
- `packages/agent-sdk/**`
- `packages/orchestration/**`
- related docs in `docs/**`

Must define:

- core entity types
- domain events
- run stage transitions
- orchestration inputs and outputs
- adapter session contract
- structured handoff format
- preload-facing runtime API shape if needed for downstream desktop work

Concrete contract outputs for this phase:

- `@iamrobot/protocol`
  - workflow contracts such as `AgentRoleAssignments`, `RunStageTransition`, and stage helpers
  - handoff contracts such as `StructuredHandoff` and `StructuredHandoffSpec`
  - runtime view contracts such as `RuntimeSnapshot` and `RuntimeRunDetails`
- `@iamrobot/agent-sdk`
  - `StartAgentSessionInput`
  - `AgentSessionHandle`
  - `AgentStreamEvent`
  - `AgentAdapter`
- `@iamrobot/orchestration`
  - `OrchestrationRuntime`
  - typed run control inputs and outputs

Non-goals:

- full adapter implementation
- UI polish
- full DB or verification implementation

Done when:

- downstream phases can build against stable exported types
- there is no ambiguity about package responsibility boundaries

## Parallel Phases

After Phase 0 is complete, the following phases can be delegated in parallel.

### Phase 1: Verification Engine

Goal:

- implement the verification runner and normalized result handling

Primary ownership:

- `packages/verification/**`

Reuse:

- `VerificationCheckKind`
- `VerificationCheckResult`
- `VerificationResult`
- `RunId`

Expected outputs:

- concrete verification runner
- profile helpers
- command execution result normalization
- pass/fail summary utilities

Non-goals:

- orchestration loop logic
- desktop UI
- adapter implementations

Done when:

- orchestration can call verification with a profile and receive typed results

### Phase 2: Git Worktree Isolation

Goal:

- implement workspace isolation helpers for per-run and per-role worktrees

Primary ownership:

- `packages/git/**`

Reuse:

- `RunId`
- `AgentRole`

Expected outputs:

- branch naming helpers
- worktree path helpers
- worktree lifecycle helpers
- merge or cherry-pick helper seams for orchestration

Non-goals:

- adapter logic
- renderer work

Done when:

- orchestration can request isolated worktree setup for a run and role

### Phase 3: Persistence Model And Repositories

Goal:

- implement persistence helpers around the run lifecycle

Primary ownership:

- `packages/db/**`

Reuse:

- all existing protocol entity types before adding new schema shapes

Expected outputs:

- completed schema alignment with protocol
- typed repository helpers for tasks, runs, sessions, artifacts, verification results, and approvals
- persistence seams usable by orchestration

Non-goals:

- orchestration policy logic
- renderer work

Done when:

- orchestration can persist and read back the core runtime lifecycle

### Phase 4: Claude Adapter

Goal:

- implement the `Claude Code` adapter against the shared adapter contract

Primary ownership:

- `packages/agent-claude/**`

Reuse:

- `AgentAdapter`
- `AgentSessionHandle`
- `StartAgentSessionInput`
- protocol handoff and artifact types

Expected outputs:

- session startup
- streaming event adapter
- structured handoff parsing
- artifact collection seam

Non-goals:

- orchestration policy decisions
- Codex-specific behavior

Done when:

- orchestration can start and observe a typed Claude session through the shared interface

### Phase 5: Codex Adapter

Goal:

- implement the `Codex CLI` adapter against the shared adapter contract

Primary ownership:

- `packages/agent-codex/**`

Reuse:

- `AgentAdapter`
- `AgentSessionHandle`
- `StartAgentSessionInput`
- protocol handoff and artifact types

Expected outputs:

- session startup
- streaming event adapter
- structured handoff parsing
- artifact collection seam

Non-goals:

- orchestration policy decisions
- Claude-specific behavior

Done when:

- orchestration can start and observe a typed Codex session through the shared interface

### Phase 6: Orchestration Runtime

Goal:

- implement the runtime loop that coordinates planning, implementation, review, verification, retries, and verdicts

Primary ownership:

- `packages/orchestration/**`

Depends on:

- Phase 0
- Phase 1
- Phase 2
- Phase 3
- Phase 4
- Phase 5

Reuse:

- protocol entities and events
- adapter contracts from `@iamrobot/agent-sdk`
- verification exports
- git workspace helpers
- persistence helpers

Expected outputs:

- run state machine execution
- policy enforcement hooks
- attempt and retry coordination
- event emission
- final verdict assembly

Implementation note:

- until cross-worktree patch or commit handoff exists, the reviewer should inspect the implementer worktree so uncommitted changes remain visible during review and verification

Non-goals:

- renderer UI polish
- adapter-specific CLI details

Done when:

- a run can move through the documented loop with typed state transitions and integrations

### Phase 7: Desktop Main And Preload Wiring

Goal:

- expose runtime capabilities from Electron main to the renderer through a typed preload bridge

Primary ownership:

- `apps/desktop/src/main/**`
- `apps/desktop/src/preload/**`
- `apps/desktop/src/shared/**`

Depends on:

- Phase 0
- Phase 6 for real runtime integration

Reuse:

- runtime APIs from orchestration
- protocol types for view models where appropriate

Expected outputs:

- typed bridge APIs
- main-process runtime wiring
- presentation-safe shared state for the renderer

Non-goals:

- renderer-side orchestration
- direct subprocess management in the renderer

Done when:

- the renderer can request and observe runtime state through preload only

### Phase 8: Desktop Renderer And UI

Goal:

- replace seeded UI with real task, run, log, and results screens

Primary ownership:

- `apps/desktop/src/renderer/**`
- `packages/ui/**`

Depends on:

- Phase 0 for stable view contracts
- Phase 7 for real bridge APIs

Reuse:

- existing shared protocol and desktop API types before introducing new view-specific shapes

Expected outputs:

- task creation screen
- run history and current run state
- log and artifact views
- verification and verdict presentation

Non-goals:

- runtime orchestration in renderer code
- CLI integration logic

Done when:

- the desktop shell renders real runtime-backed state instead of seed data

## Recommended Delegation Order

Use this order to minimize blocking:

1. Assign Phase 0 to one agent.
2. After Phase 0 is stable, assign Phases 1 through 5 in parallel.
3. Start Phase 6 once Phases 1 through 5 have published usable exports.
4. Start Phase 7 once Phase 6 exposes stable runtime APIs.
5. Start Phase 8 once Phase 7 exposes stable preload APIs.

## Ownership Matrix

Use one primary owner per phase.

| Phase | Primary Owner | Write Scope |
| --- | --- | --- |
| 0 | Contract owner | `packages/protocol`, `packages/agent-sdk`, `packages/orchestration`, relevant docs |
| 1 | Verification owner | `packages/verification` |
| 2 | Git owner | `packages/git` |
| 3 | Persistence owner | `packages/db` |
| 4 | Claude adapter owner | `packages/agent-claude` |
| 5 | Codex adapter owner | `packages/agent-codex` |
| 6 | Runtime owner | `packages/orchestration` |
| 7 | Desktop bridge owner | `apps/desktop/src/main`, `apps/desktop/src/preload`, `apps/desktop/src/shared` |
| 8 | Desktop UI owner | `apps/desktop/src/renderer`, `packages/ui` |

## Prompt Template For Delegation

Use this prompt template when assigning a phase to another AI:

```md
Work on Phase X from `docs/multi-agent-delivery-plan.md`.

You own only these files:
- <owned paths>

Requirements:
- Reuse existing types before creating new ones.
- Treat `@iamrobot/protocol` as the source of truth for shared domain types.
- Treat `@iamrobot/agent-sdk` as the source of truth for adapter contracts.
- Do not revert unrelated changes.
- Do not edit files outside your assigned scope unless absolutely necessary, and if needed keep it minimal.
- Keep orchestration out of the renderer.
- Do not build any Next.js or web surface.

Your goal:
- <phase goal>

Done when:
- <phase done criteria>
```

## Short Prompts By Phase

These are intentionally short so they can be pasted directly into another AI session.

### Phase 0 Prompt

`Work on Phase 0 from docs/multi-agent-delivery-plan.md. Finalize the shared protocol, orchestration contracts, and adapter interfaces without implementing the full runtime or adapters. Reuse existing types and keep package responsibilities explicit.`

### Phase 1 Prompt

`Work on Phase 1 from docs/multi-agent-delivery-plan.md. Own packages/verification only. Implement a typed verification runner and result normalization using existing protocol types.`

### Phase 2 Prompt

`Work on Phase 2 from docs/multi-agent-delivery-plan.md. Own packages/git only. Implement worktree and branch isolation helpers for per-run and per-role execution.`

### Phase 3 Prompt

`Work on Phase 3 from docs/multi-agent-delivery-plan.md. Own packages/db only. Implement typed persistence helpers that match the shared protocol model.`

### Phase 4 Prompt

`Work on Phase 4 from docs/multi-agent-delivery-plan.md. Own packages/agent-claude only. Implement the Claude adapter using the shared adapter contract and existing protocol types.`

### Phase 5 Prompt

`Work on Phase 5 from docs/multi-agent-delivery-plan.md. Own packages/agent-codex only. Implement the Codex adapter using the shared adapter contract and existing protocol types.`

### Phase 6 Prompt

`Work on Phase 6 from docs/multi-agent-delivery-plan.md. Own packages/orchestration only. Implement the runtime loop using the existing protocol, adapter, verification, git, and persistence contracts.`

### Phase 7 Prompt

`Work on Phase 7 from docs/multi-agent-delivery-plan.md. Own apps/desktop/src/main, apps/desktop/src/preload, and apps/desktop/src/shared. Expose typed runtime APIs to the renderer without putting orchestration in the renderer.`

### Phase 8 Prompt

`Work on Phase 8 from docs/multi-agent-delivery-plan.md. Own apps/desktop/src/renderer and packages/ui. Replace seed data screens with real runtime-backed views using the typed preload APIs.`

## Recommended Working Style

For parallel execution:

- use one git worktree per agent
- keep each branch phase-scoped
- merge contract work before merging dependent phases
- run typecheck, lint, and format checks at the end of a major task, not after every tiny edit

## Related Documents

- [App spec](app-spec.md)
- [Architecture overview](architecture.md)
- [Spec-driven development](process/spec-driven-development.md)
- [AI handoff guide](ai-handoff.md)
