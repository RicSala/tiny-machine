# @tinystack/machine

A lightweight, educational implementation of finite state machines in TypeScript, inspired by XState v5. This library is designed to help developers understand the core principles of state machines while providing a stepping stone towards using XState in production.

**~1KB gzipped** - Tiny footprint, full state machine functionality.

**[Live Examples](https://machine-demo.vercel.app/)** - Interactive demos showcasing state machine patterns.

## Why This Library?

While XState is an incredibly powerful state management solution, its extensive feature set can be overwhelming when you're just getting started with state machines. This library:

- Focuses on core state machine concepts
- Provides a similar API to XState v5
- Is lightweight and easy to understand
- Includes detailed documentation and examples
- Serves as a learning tool

## What state machines are ideal for

State machines excel at modeling systems with **clear, discrete states** and **well-defined transitions**:

- **UI components** - Modals, dropdowns, tooltips (open/closed/loading states)
- **Multi-step forms** - Wizards, checkout flows, onboarding sequences
- **Authentication flows** - Login, logout, session expiry, password reset
- **Media players** - Play, pause, stop, buffering, seeking
- **Data fetching** - Idle, loading, success, error states
- **Game logic** - Character states, turn-based mechanics, level progression
- **Workflows** - Approval processes, document lifecycles, order status

State machines help prevent impossible states (like a form being both "submitting" and "submitted") and make complex logic easier to reason about, test, and debug.

## Installation

```bash
# Using pnpm (recommended)
pnpm add @tinystack/machine

# Using npm
npm install @tinystack/machine

# Using yarn
yarn add @tinystack/machine
```

## Basic Usage

```typescript
import { setup, Actor } from '@tinystack/machine';

// Define your types
interface ToggleContext {
  count: number;
}

type ToggleEvent =
  | { type: 'TOGGLE' }
  | { type: 'INCREMENT' };

// Create a typed setup - this returns createMachine and assign with full type inference
const { createMachine, assign } = setup({
  types: {} as {
    context: ToggleContext;
    events: ToggleEvent;
  }
});

// Define your machine
const toggleMachine = createMachine({
  id: 'toggle',
  initial: 'inactive',
  context: {
    count: 0
  },
  states: {
    inactive: {
      on: {
        TOGGLE: { target: 'active' }
      }
    },
    active: {
      on: {
        TOGGLE: { target: 'inactive' },
        INCREMENT: {
          actions: [
            assign((context) => ({
              count: context.count + 1  // Full type inference!
            }))
          ]
        }
      }
    }
  }
});

// Create an actor to run the machine
const actor = new Actor(toggleMachine);

// Subscribe to state changes
actor.subscribe((snapshot) => {
  console.log('Current state:', snapshot.value);
  console.log('Context:', snapshot.context);
});

// Send events
actor.send({ type: 'TOGGLE' });
actor.send({ type: 'INCREMENT' });
```

## Key Concepts

### State Machines

A state machine is a model that describes all the possible states of your application and the ways it can transition between them. This makes your application's behavior predictable and easier to understand.

### Actors

Actors are the running instances of your state machines. They can:

- Receive events via `send()`
- Execute actions during transitions
- Maintain their own context
- Notify subscribers of changes via `subscribe()`
- Check current state with `matches()`

### Actions

Actions are side effects that occur during state transitions. The most common action is `assign`, which updates the machine's context:

```typescript
const { createMachine, assign } = setup({
  types: {} as {
    context: { count: number };
    events: { type: 'INCREMENT' };
  }
});

const counterMachine = createMachine({
  id: 'counter',
  initial: 'active',
  context: { count: 0 },
  states: {
    active: {
      on: {
        INCREMENT: {
          actions: [
            assign((context) => ({
              count: context.count + 1,
            }))
          ]
        },
      },
    },
  },
});
```

### Guards

Guards are conditions that must be met for a transition to occur:

```typescript
const { createMachine, assign } = setup({
  types: {} as {
    context: { coins: number };
    events: { type: 'INSERT_COIN' } | { type: 'PUSH' };
  }
});

const turnstileMachine = createMachine({
  id: 'turnstile',
  initial: 'locked',
  context: { coins: 0 },
  states: {
    locked: {
      on: {
        INSERT_COIN: {
          target: 'unlocked',
          guards: [
            {
              type: 'hasEnoughCoins',
              condition: (context) => context.coins >= 3,
            },
          ],
        },
      },
    },
    unlocked: {
      on: {
        PUSH: { target: 'locked' }
      }
    },
  },
});
```

### Entry and Exit Actions

Actions can also be triggered when entering or exiting a state:

```typescript
const { createMachine, assign } = setup({
  types: {} as {
    context: { elapsed: number };
    events: { type: 'START' } | { type: 'STOP' };
  }
});

const timerMachine = createMachine({
  id: 'timer',
  initial: 'idle',
  context: { elapsed: 0 },
  states: {
    idle: {
      on: { START: { target: 'running' } }
    },
    running: {
      entry: [
        { type: 'startTimer', exec: () => console.log('Timer started') }
      ],
      exit: [
        { type: 'stopTimer', exec: () => console.log('Timer stopped') }
      ],
      on: { STOP: { target: 'idle' } }
    },
  },
});
```

## Differences from XState v5

This library implements a subset of XState's features, focusing on the most important concepts:

✅ Included:

- `setup()` pattern for type-safe machine creation
- Basic state transitions
- Context management
- Actions (assign, entry, exit, transition actions)
- Guards
- Event handling
- State subscription
- Snapshot caching

❌ Not included (available in XState):

- Spawned actors / actor system
- Invoked services
- Delayed transitions
- Parallel states
- History states
- State visualization
- Development tools

## When to Use This Library vs XState

Use this library when:

- Learning state machine concepts
- Building simple state-driven applications
- Teaching others about state machines
- Prototyping before moving to XState

Use XState when:

- Building production applications
- Needing advanced features
- Requiring visualization tools
- Working with complex state orchestration
- Needing actor model capabilities

## Contributing

Contributions are welcome! This library aims to be educational, so we prioritize:

- Clear, well-documented code
- Simple, focused features
- Educational examples
- Good test coverage

## License

MIT

## Acknowledgments

This library is inspired by XState and serves as an educational tool for understanding its concepts. Special thanks to the XState team for their excellent work in making state machines accessible to the JavaScript community.
