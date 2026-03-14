# Architecture Overview

This page summarizes the intended system shape for the first implementation phase.

## System Map

```mermaid
flowchart LR
  U["User"] --> R["Renderer (React)"]
  R --> P["Preload bridge"]
  P --> M["Electron main process"]
  M --> O["Local runtime / orchestrator"]
  O --> C1["Codex adapter"]
  O --> C2["Claude adapter"]
  O --> V["Verification engine"]
  O --> D["SQLite + Drizzle"]
  O --> G["Git worktrees"]
```

## Responsibility Boundaries

### Renderer

The renderer should handle:

- task creation
- run history
- logs and diffs
- settings
- approvals

The renderer should not spawn or manage subprocesses directly.

### Main Process And Runtime

The main process and runtime should handle:

- process lifecycle
- PTY management
- orchestration
- policy enforcement
- artifact capture
- verification

### Adapters

Adapters should translate between the shared protocol and each CLI's real behavior.

They should not decide run strategy.

## Execution Loop

```mermaid
flowchart TD
  A["Task created"] --> B["Claude plans"]
  B --> C["Codex implements"]
  C --> D["Claude reviews"]
  D --> E{"Needs another pass?"}
  E -- Yes --> C
  E -- No --> F["Verification runs"]
  F --> G{"Checks pass?"}
  G -- No --> C
  G -- Yes --> H["Final verdict"]
```

## Current Constraint

The architecture is desktop-first and local-first.

`Next.js` is deferred. No web surface should be implemented unless the user explicitly approves it.
