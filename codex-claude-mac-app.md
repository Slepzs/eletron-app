# Mac App For Coordinating Codex And Claude Code

## Goal

Build a local-first desktop app that can control both the Codex CLI and the Claude Code CLI, give them different roles, and make them work together on the same task without stepping on each other.

The stack should follow the same overall direction as `superset.sh`: an `Electron` desktop app, a TypeScript monorepo, shared UI and protocol packages, local persistence, and a lightweight cloud layer only where it provides real value.

## Recommended Stack

### Core Product Stack

- `Electron` for the desktop shell
- `React` for the application UI
- `TypeScript` across desktop, backend-for-frontend, orchestration, and shared packages
- `Bun` for package management and local scripts
- `Turborepo` for the monorepo and task graph
- `Tailwind CSS` and `shadcn/ui` for UI primitives
- `tRPC` for internal typed APIs between renderer and app services
- `Drizzle ORM` for typed database access
- `SQLite` for local state

### Optional Cloud Layer

- `Next.js` for a web app, docs, marketing site, or optional remote dashboard
- `Neon Postgres` for cloud persistence if runs, team state, or sync are added later

This keeps the first version local-first while leaving room for the same multi-surface product shape that `superset.sh` appears to use.

## Why This Stack

This product is mostly a local developer tool, not a browser-first SaaS product. The hard parts are:

- running long-lived local CLIs safely
- managing PTYs and subprocess lifecycles
- isolating workspaces
- coordinating multiple agents
- presenting diffs, logs, and approval gates

`Electron` is the right fit if the goal is to match the `superset.sh` style of product architecture. It gives:

- strong macOS support
- access to native process control through Node APIs
- a single React codebase for the desktop UI
- room to add web surfaces later without changing the main frontend stack

`Tauri` plus `Rust` is a valid alternative, but it is not the same stack direction. If the goal is specifically "build this like Superset", the cleaner choice is `Electron` plus a TypeScript-first monorepo.

## Product Shape

The application should be structured as five major parts:

1. Desktop shell
2. Local runtime
3. Agent adapters
4. Shared protocol and data model
5. Verification engine

## 1. Desktop Shell

Use `Electron` with a clear separation between:

- main process
- preload bridge
- renderer app

The renderer should be a `React` app responsible for:

- task creation
- run history
- live logs
- diff inspection
- approval prompts
- settings for CLI paths, policies, and timeouts

The renderer should never directly spawn subprocesses. It should call a narrow typed application API exposed through the preload layer.

## 2. Local Runtime

The local runtime is the real core of the product. It should live in a dedicated package or app service layer and own:

- session lifecycle
- subprocess spawning
- PTY management for interactive CLIs
- task routing
- workspace isolation
- retries and loop policy
- verification runs
- artifact collection
- final verdict generation

On Electron, this runtime should live in the main process or in dedicated Node worker processes, not inside the renderer.

## 3. Agent Adapters

Each CLI should be wrapped behind the same interface:

- `startSession`
- `sendMessage`
- `streamEvents`
- `interrupt`
- `terminate`
- `collectArtifacts`

Each adapter should normalize:

- stdout and stderr
- exit status
- structured handoff blocks
- file-change metadata
- retryable failure categories

The adapters should not contain orchestration logic. They should only translate between the app protocol and the actual CLI behavior.

## 4. Shared Protocol And Data Model

Do not pass free-form prose around as the system boundary. Define a strict internal event and state model in a shared package.

Core entities:

- `Run`
- `Task`
- `AgentSession`
- `Artifact`
- `VerificationResult`
- `Verdict`
- `ApprovalRequest`

Suggested task payload fields:

- `taskId`
- `repoPath`
- `baseBranch`
- `goal`
- `constraints`
- `acceptanceCriteria`
- `allowedPaths`
- `verificationProfile`

Suggested verdict fields:

- `status`
- `summary`
- `blockingIssues`
- `proposedNextAction`
- `confidence`

### Required Structured Handoffs

Each agent response should include machine-readable sections such as:

- `PLAN`
- `ASSUMPTIONS`
- `CHANGES`
- `RISKS`
- `REQUESTED_ACTION`

If a CLI cannot emit JSON directly, the adapter should enforce a rigid tagged format and parse that into the shared event model.

## 5. Verification Engine

Verification should be based on external checks, not model agreement alone.

Recommended checks:

- `typecheck`
- `lint`
- `tests`
- optional runtime smoke checks
- repository policy checks

The orchestrator should treat agent review as advisory and automated checks as authoritative.

## Monorepo Layout

A Superset-style monorepo for this product should look roughly like this:

```text
apps/
  desktop/        Electron app
  web/            Optional Next.js web app or remote dashboard
  docs/           Optional documentation site
  marketing/      Optional marketing site

packages/
  ui/             Shared React UI primitives
  orchestration/  Run loop, policies, and task routing
  agent-sdk/      Common agent interfaces and utilities
  agent-codex/    Codex CLI adapter
  agent-claude/   Claude Code CLI adapter
  protocol/       Shared event and domain types
  db/             Drizzle schema and repositories
  git/            Worktree and patch helpers
  verification/   Typecheck, lint, test, and policy runners
  config/         Shared tsconfig, eslint, prettier/biome config
```

This structure keeps the renderer thin and prevents orchestration logic from being buried in UI code.

## Execution Model

The initial autonomous loop should be explicit and constrained:

1. Claude receives the task and writes a structured plan.
2. Codex receives the plan and makes the code changes.
3. Claude reviews the diff, plan alignment, and likely regressions.
4. The orchestrator decides whether to accept the critique or request another implementation pass.
5. The verification engine runs the required checks.
6. If checks fail, Codex receives the failure context and tries again.
7. The loop stops on success, max retries, or hard policy failure.

For a first version, the roles should be:

- Claude as `planner` and `reviewer`
- Codex as `implementer`

That is simpler and usually stronger than asking both models to do every role.

## Workspace Strategy

The system should not let multiple agents write to the same working tree at the same time.

Recommended approach:

- keep one canonical repository path
- create per-run git worktrees
- create per-agent branches inside the run
- merge or cherry-pick only through orchestrator-controlled steps

This gives:

- isolated experimentation
- easier rollback
- reproducible diffs
- simpler artifact capture

## Runtime Safety

The runtime needs policy boundaries from day one:

- allowed command prefixes
- allowed file paths
- max runtime per step
- max retry loops
- network policy per run
- destructive action restrictions

Every run should produce an audit log containing:

- prompts sent
- agent outputs
- commands executed
- files changed
- verification results
- final verdict

## Local Persistence

Use `SQLite` for local persistence through `Drizzle`.

Store:

- tasks
- run metadata
- event logs
- artifacts
- diff summaries
- verification history
- approval decisions

Do not store secrets in `SQLite`. Store credentials through the macOS Keychain.

## Cloud Persistence

Do not require a backend for the MVP.

If later versions need:

- cross-device sync
- team collaboration
- shared run history
- remote review links

then add a small cloud layer using:

- `Next.js` app routes or server actions for account-facing surfaces
- `tRPC` for typed internal APIs where appropriate
- `Neon Postgres` via `Drizzle` for server persistence

The cloud layer should remain optional. The desktop app should still work fully in local-only mode.

## Packaging And Distribution

This app is a poor fit for the Mac App Store sandbox because it needs to:

- launch arbitrary CLIs
- inspect repositories
- manage worktrees
- read and write across developer project directories

The realistic path is:

- distribute a notarized macOS app outside the App Store
- ship the desktop app bundle
- detect missing local prerequisites on startup
- show remediation steps if `codex` or `claude` is unavailable

## MVP Scope

The first serious version should exclude:

- cloud sync
- team collaboration
- arbitrary plugin execution
- more than two agent roles
- complex branch graph management

The MVP should include:

- one repo at a time
- one autonomous run at a time
- Claude planner/reviewer
- Codex implementer
- git worktree isolation
- structured handoffs
- typecheck, lint, and test verification
- final result screen with summary, diff, and logs

## Suggested Delivery Phases

### Phase 1

Build the runtime first, without a polished UI. Prove that it can:

- spawn both CLIs
- hand off structured tasks
- run a planner -> implementer -> reviewer loop
- execute verification commands
- stop cleanly on success or failure

### Phase 2

Wrap the runtime in the `Electron` desktop shell and add:

- task submission
- live logs
- run history
- diff review
- settings

### Phase 3

Add productization layers:

- approval queues
- reusable verification profiles
- repo-specific policies
- failure clustering
- optional parallel subtask execution
- optional cloud sync

## Recommendation

If you want the same direction as `superset.sh`, do not build this as `SwiftUI` or `Tauri` first.

Build it as:

- `Electron`
- `React`
- `TypeScript`
- `Bun`
- `Turborepo`
- `tRPC`
- `Drizzle`
- local `SQLite`
- optional `Next.js` plus `Neon` later

That gives you the closest architectural match while still fitting the actual needs of a local multi-agent coding app.
