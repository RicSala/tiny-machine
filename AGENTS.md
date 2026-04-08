## What This Product Does

`machine-turbo` is a Turbo monorepo for developing the `@tinystack/machine` library and its demo app together.

- `packages/machine`: the published finite state machine library
- `apps/demo`: the Next.js demo app that acts as both validation surface and living documentation

The library is intentionally small and educational. It focuses on explicit state transitions, typed context/events, and an API shape inspired by XState v5 without trying to match XState feature-for-feature.

### Product Principles (enforce these in code)

- **Keep the core small and legible**: this library is valuable partly because people can read it and understand how it works.
- **Prefer explicit states over boolean soup**: the demo repeatedly teaches this idea; new examples and APIs should reinforce it.
- **TypeScript is part of the product**: preserve the `setup({ types })` experience, literal state inference, and typed `assign()` ergonomics.
- **The demo is not filler**: demo routes are user education, API validation, and regression coverage for real usage patterns.

## Tech Stack

- `pnpm` workspaces
- `turbo`
- TypeScript
- React 19
- Next.js 16 App Router
- Tailwind CSS 4
- Radix UI primitives
- shadcn/ui-style components in the demo app
- `tsup` for packaging `@tinystack/machine`
- Vitest for runtime and type tests
- ESLint in the demo app

## Monorepo Structure

Top-level:

- `packages/machine`: library source, tests, and package docs
- `apps/demo`: demo app for showcasing machine patterns

Important library areas:

- `packages/machine/src/StateMachine.ts`: pure transition logic, transition selection, `setup()`
- `packages/machine/src/Actor.ts`: runtime execution, subscriptions, action execution, snapshot lifecycle
- `packages/machine/src/actions.ts`: `assign()` helper and action tagging
- `packages/machine/src/types.ts`: public type surface and inference helpers
- `packages/machine/src/index.ts`: package exports
- `packages/machine/tests/StateMachine.test.ts`: runtime transition behavior
- `packages/machine/tests/Actor.test.ts`: actor runtime behavior
- `packages/machine/tests/types`: type-level contract tests
- `packages/machine/tests/examples/timer.test.ts`: example-style machine coverage

Important demo areas:

- `apps/demo/src/app/page.tsx`: demo index and positioning of the product
- `apps/demo/src/app/demos/coin-turnstile/page.tsx`: ordered transition arrays and guard branching
- `apps/demo/src/app/demos/async-search/page.tsx`: debouncing, async races, request identity
- `apps/demo/src/app/demos/session-timeout/page.tsx`: timers, entry/exit cleanup, warning/logout flow
- `apps/demo/src/app/demos/form-wizard/page.tsx`: guarded progression in multi-step flows
- `apps/demo/src/app/demos/async-fetch/page.tsx`: impossible states vs boolean flags
- `apps/demo/src/app/demos/toggle-confirm/page.tsx`: explicit confirmation states
- `apps/demo/src/components/ui`: shared demo UI primitives

Generated artifacts:

- `packages/machine/dist`: build output from `tsup`
- `apps/demo/.next`: Next.js build output

Do not hand-edit generated output unless the user explicitly asks for that.

## Architecture Notes

The repo currently follows a clean split:

- `StateMachine` is the pure model. It selects transitions, evaluates guards, and collects exit, transition, and entry actions.
- `Actor` is the runtime. It owns the mutable snapshot, executes actions, notifies subscribers, and exposes `send`, `matches`, `start`, `stop`, and `getSnapshot`.
- `assign()` is the context update primitive. `setup({ types })` returns a typed `assign()` and `createMachine()` so consumers get inference for context, events, and state values.

Behavior worth preserving:

- transition arrays are first-match-wins
- root-level `on` acts as fallback when no state-level transition is enabled
- `reenter: true` forces exit/entry actions even for same-state transitions
- `machine.can(snapshot, event)` is a pure query over the transition model
- snapshot typing and `assign()` inference are protected by dedicated type tests

## Essential Commands

Repo-level:

- `pnpm dev`
- `pnpm build`
- `pnpm lint`
- `pnpm test`
- `pnpm typecheck`

Package-level:

- `pnpm --filter @tinystack/machine build`
- `pnpm --filter @tinystack/machine dev`
- `pnpm --filter @tinystack/machine test`
- `pnpm --filter @tinystack/machine test:watch`
- `pnpm --filter @tinystack/machine test:types`
- `pnpm --filter @tinystack/machine typecheck`
- `pnpm --filter @tinystack/machine-demo dev`
- `pnpm --filter @tinystack/machine-demo build`
- `pnpm --filter @tinystack/machine-demo lint`
- `pnpm --filter @tinystack/machine-demo typecheck`

## Known Repo Quirks

- The root script `pnpm type:check` is currently broken because the workspace uses `typecheck`, not `type:check`. Use `pnpm typecheck`.
- `apps/demo/README.md` is still the default Next.js starter README and is not trustworthy as project documentation.
- Next.js builds currently emit a `baseline-browser-mapping` staleness warning. It is noisy but non-blocking.
- There may be active in-progress edits in the worktree. Never revert unrelated changes you did not make.

## Testing

When changing library behavior or public types:

- run `pnpm --filter @tinystack/machine typecheck`
- run `pnpm --filter @tinystack/machine build`
- run `pnpm --filter @tinystack/machine test`
- run `pnpm --filter @tinystack/machine-demo typecheck` if consumer typing may be affected
- run `pnpm --filter @tinystack/machine-demo build` if demo usage or public API changed

When changing demo behavior only:

- run `pnpm --filter @tinystack/machine-demo lint`
- run `pnpm --filter @tinystack/machine-demo typecheck`
- run `pnpm --filter @tinystack/machine-demo build` for meaningful route/UI changes

When changing docs only:

- verify examples still match the current `setup`, `createMachine`, `Actor`, and `assign` APIs
- update drifted docs in the same turn when practical

## Documentation

Docs are currently spread across a few places:

- `packages/machine/README.md`: primary product and API documentation
- `packages/machine/CHANGELOG.md`: release and API evolution notes
- `apps/demo/src/app/demos/*`: living examples of intended usage
- `README.md`: short workspace overview

There is no dedicated docs site or `SUMMARY.md` map in this repo right now. Do not reference nonexistent docs structure from other projects.

If you change:

- library API: update `packages/machine/README.md` and relevant demo routes
- demo routes or preferred examples: update demo copy so the app remains good teaching material
- workflow commands: update `README.md` and this file when practical

## Coding Style

Favor habitability over cleverness. This repo is small enough that readability and locality matter more than abstraction density.

- Keep pure machine logic in the machine definition or `StateMachine` layer; keep runtime concerns in `Actor`.
- Prefer explicit, named states and events over implicit boolean combinations.
- Keep machine config readable: named `Context` and `Event` types, obvious state names, shallow indentation, and early returns.
- Preserve the current consumer-facing API shape unless there is a strong reason to change it.
- Prefer `setup({ types })` for typed examples and tests instead of untyped shortcuts.
- Avoid leaking non-domain implementation details into machine context when a local timer/ref/WeakMap is a better fit.
- Add abstraction only when it actually reduces repetition or clarifies the model.
- Comment sparingly. Most machine configs should explain themselves through naming.

Be pragmatic.
Be useful, not clever.
Prefer clarity over indirection.

## Working Conventions

- Fix root causes, not surface symptoms.
- Treat type tests as part of the public API contract, not as optional extras.
- When changing library semantics, inspect both runtime tests and demo routes because the demo is effectively an integration suite.
- Prefer adding or refining examples when introducing a new pattern; this project teaches through concrete demos.
- One-off scripts or ad-hoc helpers should be written in Node.js, not Python.
- If you research an external library, look for its `llm.txt` or official docs first.
- `"Explain"`, `"Discuss"`, or `"Sketch"` means do not change code yet.
- Suggest commits when we finish a coherent chunk of work.

## Cowboy Rule

Leave the repo more truthful than you found it.

- Remove drift between implementation and docs when you touch an area
- Update stale guidance files instead of working around them silently
- Leave breadcrumb notes in the thread about quirks, risks, and useful validation commands
