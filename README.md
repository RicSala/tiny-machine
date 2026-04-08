# machine-turbo

Monorepo prototype for developing the `@tinystack/machine` library and the demo app in one place with Turborepo.

## Workspace layout

- `packages/machine`: the finite state matching library
- `apps/demo`: the Next.js demo app

## Commands

- `pnpm install`: install dependencies for the whole workspace
- `pnpm dev`: build the library once, then start the workspace dev tasks
- `pnpm build`: build the library and demo through Turbo
- `pnpm test`: run workspace tests
- `pnpm lint`: run lint tasks where available
