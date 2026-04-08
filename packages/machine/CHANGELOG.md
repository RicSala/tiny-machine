# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.1] - 2025-12-11

### Changed
- Minified bundle output (~1KB gzipped, down from ~6KB unminified)
- Updated README with bundle size information

### Removed
- Debug console.log statements from Actor

## [0.2.0] - 2025-12-11

### Breaking Changes & Migration Guide

**If you were using `assign()` directly:**

```typescript
// Before (0.1.x) - assign with 3 type parameters
import { assign } from '@tinystack/machine';
const action = assign<MyContext, MyEvent, MyState>((ctx) => ({ count: ctx.count + 1 }));

// After (0.2.x) - use setup() for full type inference
import { setup } from '@tinystack/machine';
const { createMachine, assign } = setup({
  types: {} as { context: MyContext; events: MyEvent }
});
const action = assign((ctx) => ({ count: ctx.count + 1 })); // Types inferred!
```

**If you were using `StateMachine` directly:**

```typescript
// Before (0.1.x)
import { StateMachine } from '@tinystack/machine';
const machine = new StateMachine<MyContext, MyEvent, 'idle' | 'active'>({...});

// After (0.2.x) - recommended approach
import { setup } from '@tinystack/machine';
const { createMachine } = setup({
  types: {} as { context: MyContext; events: MyEvent }
});
const machine = createMachine({...}); // State types inferred from config!
```

> Note: Direct `StateMachine` usage still works but won't have full type inference.

### Added
- `setup()` function for type-safe machine creation (XState v5 pattern)
- Type-safe `assign()` helper returned from `setup()` with full context/event inference
- Comprehensive type tests (`tests/types/`) to prevent type regressions
- GitHub Actions workflow for automated npm publishing with provenance
- Timer example test (`tests/examples/timer.test.ts`)

### Changed
- Improved TypeScript type inference for state machine configuration
- `target` property now validates against defined states using `NoInfer<T>`
- Moved type definitions from `types.d.ts` to `types.ts`
- Reorganized test files into `tests/` directory

### Fixed
- Type inference for `assign()` actions now properly infers context and event types
- State value inference no longer polluted by transition target values

## [0.1.2] - 2025-12-10

### Added
- Namespace configuration for npm package

## [0.1.1] - 2025-12-10

### Added
- Initial public release
- `StateMachine` class for defining state machine configuration
- `Actor` class for runtime execution
- `assign()` action helper for context updates
- Guards support for conditional transitions
- Entry/exit actions support
- Snapshot caching for performance
- TypeScript support with full type definitions
