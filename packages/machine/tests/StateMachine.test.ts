import { describe, it, expect } from 'vitest';
import { StateMachine } from '../src/StateMachine';
import type { MachineConfig, EventObject } from '../src/types';
import { Actor } from '../src/Actor';
import { assign } from '../src/actions';

interface TestContext {
  count: number;
}

interface TestEvents extends EventObject {
  type: 'INCREMENT' | 'DECREMENT' | 'RESET';
}

type TestState = 'active';

const createTestMachine = () => {
  const incrementAction = assign<TestContext, TestEvents>(({ context }) => ({
    count: context.count + 1,
  }));

  const decrementAction = assign<TestContext, TestEvents>(({ context }) => ({
    count: context.count - 1,
  }));

  const resetAction = assign<TestContext, TestEvents>(() => ({
    count: 0,
  }));

  const config: MachineConfig<TestContext, TestEvents, TestState> = {
    id: 'counter',
    initial: 'active',
    context: {
      count: 0,
    },
    states: {
      active: {
        on: {
          INCREMENT: {
            actions: [incrementAction],
          },
          DECREMENT: {
            actions: [decrementAction],
          },
          RESET: {
            actions: [resetAction],
          },
        },
      },
    },
  };

  return new StateMachine(config);
};

const createTestMachineWithGuards = () => {
  const config: MachineConfig<TestContext, TestEvents, TestState> = {
    id: 'counter',
    initial: 'active',
    context: {
      count: 0,
    },
    states: {
      active: {
        on: {
          INCREMENT: {
            actions: [
              assign(({ context }) => ({
                count: context.count + 1,
              })),
            ],
            guard: (context) => context.count < 2,
          },
        },
      },
    },
  };

  return new StateMachine(config);
};

describe('StateMachine', () => {
  it('should create a machine with initial state and context', () => {
    const machine = createTestMachine();
    const actor = new Actor(machine);
    const snapshot = actor.getSnapshot();

    expect(snapshot.value).toBe('active');
    expect(snapshot.context.count).toBe(0);
  });

  it('should compute next snapshot context inside the machine transition', () => {
    const machine = createTestMachine();
    const result = machine.transition(machine.getInitialSnapshot(), {
      type: 'INCREMENT',
    });

    expect(result).toBeDefined();
    expect(result?.snapshot.value).toBe('active');
    expect(result?.snapshot.context.count).toBe(1);
    expect(result?.actions).toHaveLength(0);
  });

  it('should compute initial entry assign actions inside getInitialTransition', () => {
    const machine = new StateMachine<TestContext, TestEvents, TestState>({
      id: 'test',
      initial: 'active',
      context: { count: 0 },
      states: {
        active: {
          entry: [
            assign(({ context }) => ({
              count: context.count + 2,
            })),
          ],
        },
      },
    });

    const initial = machine.getInitialTransition();

    expect(initial.snapshot.context.count).toBe(2);
    expect(initial.actions).toHaveLength(0);
  });

  it('should handle transitions and update context', () => {
    const machine = createTestMachine();
    const actor = new Actor<TestContext, TestEvents, TestState>(machine);

    actor.send({ type: 'INCREMENT' });
    expect(actor.getSnapshot().context.count).toBe(1);

    actor.send({ type: 'INCREMENT' });
    expect(actor.getSnapshot().context.count).toBe(2);

    actor.send({ type: 'DECREMENT' });
    expect(actor.getSnapshot().context.count).toBe(1);

    actor.send({ type: 'RESET' });
    expect(actor.getSnapshot().context.count).toBe(0);
  });

  it('should notify subscribers of state changes', () => {
    const machine = createTestMachine();
    const actor = new Actor<TestContext, TestEvents, TestState>(machine);

    const snapshots: any[] = [];
    const unsubscribe = actor.subscribe((snapshot) => {
      snapshots.push({ ...snapshot });
    });

    actor.send({ type: 'INCREMENT' });
    actor.send({ type: 'INCREMENT' });
    actor.send({ type: 'DECREMENT' });

    unsubscribe();

    expect(snapshots).toHaveLength(4); // Initial + 3 updates
    expect(snapshots[0].context.count).toBe(0); // Initial
    expect(snapshots[1].context.count).toBe(1); // After first INCREMENT
    expect(snapshots[2].context.count).toBe(2); // After second INCREMENT
    expect(snapshots[3].context.count).toBe(1); // After DECREMENT
  });

  it('should handle entry and exit actions', () => {
    const sideEffects: string[] = [];

    const machineWithEntryExit = new StateMachine<
      TestContext,
      TestEvents,
      TestState
    >({
      id: 'test',
      initial: 'active',
      context: { count: 0 },
      states: {
        active: {
          entry: [
            {
              type: 'logEntry',
              exec: () => {
                console.log('entered active');
                sideEffects.push('entered active');
              },
            },
          ],
          exit: [
            {
              type: 'logExit',
              exec: () => {
                console.log('exited active');
                sideEffects.push('exited active');
              },
            },
          ],
          on: {
            INCREMENT: {
              target: 'active',
              reenter: true,
              actions: [
              assign(({ context }) => ({
                count: context.count + 1,
              })),
            ],
          },
          },
        },
      },
    });

    const actor = new Actor<TestContext, TestEvents, TestState>(
      machineWithEntryExit
    );
    actor.start();
    console.log('STATUS:', actor.getSnapshot().status);
    expect(sideEffects).toEqual(['entered active']);

    actor.send({ type: 'INCREMENT' });
    expect(sideEffects).toEqual([
      'entered active',
      'exited active',
      'entered active',
    ]);
  });

  it('should handle guards correctly', () => {
    const machine = createTestMachineWithGuards();
    const actor = new Actor<TestContext, TestEvents, TestState>(machine);

    // First increment should work (0 -> 1)
    actor.send({ type: 'INCREMENT' });
    expect(actor.getSnapshot().context.count).toBe(1);

    // Second increment should work (1 -> 2)
    actor.send({ type: 'INCREMENT' });
    expect(actor.getSnapshot().context.count).toBe(2);

    // Third increment should be blocked by guard
    actor.send({ type: 'INCREMENT' });
    expect(actor.getSnapshot().context.count).toBe(2); // Count should remain at 2
  });

  it('should select the first enabled transition from an array', () => {
    const machine = new StateMachine<TestContext, TestEvents, TestState>({
      id: 'counter',
      initial: 'active',
      context: { count: 0 },
      states: {
        active: {
          on: {
            INCREMENT: [
              {
                guard: (context) => context.count >= 10,
                actions: [
                  assign(({ context }) => ({
                    count: context.count + 100,
                  })),
                ],
              },
              {
                actions: [
                  assign(({ context }) => ({
                    count: context.count + 1,
                  })),
                ],
              },
            ],
          },
        },
      },
    });

    const actor = new Actor<TestContext, TestEvents, TestState>(machine);
    actor.send({ type: 'INCREMENT' });

    expect(actor.getSnapshot().context.count).toBe(1);
  });

  it('should fall back to root transitions when no state transition is enabled', () => {
    const machine = new StateMachine<TestContext, TestEvents, TestState>({
      id: 'counter',
      initial: 'active',
      context: { count: 0 },
      on: {
        RESET: {
          actions: [
            assign(() => ({
              count: 99,
            })),
          ],
        },
      },
      states: {
        active: {
          on: {
            RESET: {
              guard: (context) => context.count > 100,
              actions: [
                assign(() => ({
                  count: 0,
                })),
              ],
            },
          },
        },
      },
    });

    const actor = new Actor<TestContext, TestEvents, TestState>(machine);
    actor.send({ type: 'RESET' });

    expect(actor.getSnapshot().context.count).toBe(99);
  });
});
