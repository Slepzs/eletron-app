# Renderer UI Stack

This page records the approved UI package baseline for the desktop renderer and shared UI package.

## Current Decision

Use a custom Electron desktop shell built from shared React components, headless primitives, and focused desktop-oriented libraries.

Avoid introducing a large, opinionated application design system.

## Package Ownership

### `apps/desktop`

`apps/desktop` owns the renderer styling entrypoint and authoring tools:

- `tailwindcss`
- `@tailwindcss/cli`
- `shadcn`

The Tailwind scaffold lives at `apps/desktop/src/renderer/styles/tailwind.css`.

The current scripts are:

- `bun run --filter @iamrobot/desktop tailwind:build`
- `bun run --filter @iamrobot/desktop tailwind:watch`

These scripts prepare a stylesheet for the renderer migration from inline styles to Tailwind classes.

### `packages/ui`

`packages/ui` owns the shared presentational and interactive building blocks:

- `@radix-ui/react-context-menu`
- `@radix-ui/react-dialog`
- `@radix-ui/react-dropdown-menu`
- `@radix-ui/react-scroll-area`
- `@radix-ui/react-slot`
- `@radix-ui/react-tabs`
- `@radix-ui/react-tooltip`
- `@xterm/addon-fit`
- `@xterm/xterm`
- `class-variance-authority`
- `clsx`
- `cmdk`
- `lucide-react`
- `react-resizable-panels`
- `react-virtuoso`
- `tailwind-merge`

These libraries support the intended desktop UI:

- pane-based application layout
- dialogs, menus, tooltips, tabs, and command surfaces
- large virtualized lists for runs, logs, diffs, and trees
- terminal rendering for CLI sessions
- typed Tailwind variants in shared components

## Current Constraint

The dependencies and Tailwind scaffold are installed, but the renderer has not been migrated off inline styles yet.

The app should move incrementally:

1. add shared `packages/ui` primitives and wrappers
2. replace inline renderer styles with Tailwind classes
3. adopt terminal, virtualization, and pane components when those views are implemented

## Deferred Packages

The following packages remain intentionally deferred:

- `monaco-editor`
  Use only when the product needs an editor-grade diff or log viewer.
- `dnd-kit`
  Use only when the product needs draggable tabs, cards, or workspace ordering.
