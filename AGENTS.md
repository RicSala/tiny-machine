## What This Product Does

Tourista is a React onboarding/product-tour library developed in a Turbo monorepo.

- `packages/tourista`: the published library
- `apps/touring-demo`: the demo/validation app that exercises the library API

### Design Principles (enforce these in code)

- **Hide complexity from the user**: using the library should be obvious. Only show internals in advanced cases.
- **Consumer DX matters**: prefer APIs that read like intent, not machine plumbing.
- **TypeScript should help the consumer**: preserve literal types when possible and favor APIs that unlock autocomplete.

## Tech Stack

- `pnpm` workspaces
- `turbo`
- TypeScript
- React 19
- Next.js 15
- `@tinystack/machine` for the tour state machine
- `@floating-ui/react` for positioning
- Vitest for package tests
- ESLint

## Monorepo Structure

Top-level:

- `apps/touring-demo`: demo app for exercising the library in realistic flows
- `packages/tourista/src`: library source
- `packages/tourista/dist`: built package output
- `packages/tourista/docs`: product/package docs
- `packages/tourista/tests`: package tests

Important library areas:

- `packages/tourista/src/hooks/useTour.ts`: public hook surface
- `packages/tourista/src/helpers/tourMachineGenerator.ts`: machine generation and typed helpers
- `packages/tourista/src/components/TourProvider.tsx`: active tour context/provider state
- `packages/tourista/src/components/TourMachineReact.tsx`: runtime machine/actor wiring

Important demo areas:

- `apps/touring-demo/src/app/showcase`: feature showcase
- `apps/touring-demo/src/app/optimized-demo`: more realistic end-to-end flows

## Essential Commands

Repo-level:

- `pnpm dev`
- `pnpm build`
- `pnpm lint`
- `pnpm type:check`
- `pnpm test`

Package-level:

- `pnpm --filter tourista build`
- `pnpm --filter tourista type:check`
- `pnpm --filter tourista test`
- `pnpm --filter touring-demo build`
- `pnpm --filter touring-demo lint`

## Testing

When changing library behavior:

- run `pnpm --filter tourista type:check`
- run `pnpm --filter tourista build`
- run `pnpm --filter tourista test` when logic/state-machine behavior changes
- run `pnpm --filter touring-demo build` when public API or consumer behavior changes

When changing docs/examples only:

- verify the examples reflect the current API surface
- update drifted docs in `packages/tourista/docs`

If you change the public library API, verify both the library package and the demo app.

## Documentation

Docs are part of the product. Keep them in sync with the implementation.

- Primary docs live in `packages/tourista/docs`
- Demo usage in `apps/touring-demo` also acts as living documentation
- If the code changes the preferred API, update docs in the same turn when practical
- When you need to read docs, use SUMMARY.md as map

## Coding Style

It is important that you respect this coding style guide. In general, the main principle is "favor habitability of the codebase over cleverness or optimization", and reduce the cognitive load necessary to review a section of code.

- **Locality of behavior**: Code that changes together should remain together or at least close
- **Code should be legible**: by itself. Code should be clear and read like a novel. That means clear naming.
- **Keep the main path at the lowest possible level of indentation**: Use early returns
- **Functions should be at one level of abstraction**
- **When a function has more than 3 parameters use an object**
- **Avoid excessive indirection**: Do not abstract unless there is a reason to do so, usually 3 or more uses of the same code
- **The open/closed principle**: Structure the code such that we can extend it instead of modify it
- **When you abstract, make it deep**: Hide complexity behind the abstraction. Small surface area.
- **The use case defines the API**: Purism leaks logic. Instead the API should provide what the use case needs.

Be pragmatic applying these principles.
Be useful, not smart.
Favor simplicity and reduce indirection.

## Shadcn

Use the CLI.

- List items in registries: `pnpm dlx shadcn search @shadcn --limit X --offset Y`
- Search items in registries: `pnpm dlx shadcn search @shadcn --query "button"`
- Get item examples from registries: `pnpm dlx shadcn search @shadcn --query "button-demo"`

## Cowboy Rule

Leave things better than they were when you started.

- After using docs, suggest potential improvements to avoid confusion
- Make future AI agents smarter and more aware of the context
- After coding sessions, always check feature documentation and fix drifting

## Others

- Fix root cause, not a band-aid
- Use first-principles thinking. Understand the goal and suggest better approaches when fit.
- Leave breadcrumb notes in the thread
- When you need to research a library, search for the library `llm.txt` URL first
- You need feedback; code accordingly and suggest feedback loops
- `"Document research"` means create a detailed explanation in `docs/research`. Those are not product docs; they are explanations of patterns we are exploring or implementing.
- Run tests before handoff for turns with significant changes
- One-off script or ad-hoc helper: in Node.js, no Python
- Comment only when necessary: hard logic or places that need explanation to avoid future regression
- `"Explain"`, `"Discuss"`, `"Sketch"` from the user means do not change code yet
- Suggest commits often: suggest the user commit changes before changing topics
