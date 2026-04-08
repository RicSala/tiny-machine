import { describe, it, expect, vi } from 'vitest';
import { assign } from '../src/actions';
import { setup } from '../src/StateMachine';
import { Actor } from '../src/Actor';
import type { ActorLogic, MachineConfig, EventObject } from '../src/types';

interface TestContext {
  value: number;
}

interface TestEvents extends EventObject {
  type: 'INCREMENT' | 'STOP' | 'START';
}

type TestState = 'idle';

const createTestMachine = () => {
  const config: MachineConfig<TestContext, TestEvents, TestState> = {
    id: 'test',
    initial: 'idle',
    context: {
      value: 0,
    },
    states: {
      idle: {
        on: {
          INCREMENT: {
            actions: [
              assign(({ context }) => ({
                value: context.value + 1,
              })),
            ],
          },
        },
      },
    },
  };

  return setup({
    types: {} as { context: TestContext; events: TestEvents },
  }).createMachine(config);
};

describe('Actor', () => {
  it('should have a unique ID', () => {
    const machine = createTestMachine();
    const actor1 = new Actor(machine);
    const actor2 = new Actor(machine);

    expect(actor1.id).toBeDefined();
    expect(actor2.id).toBeDefined();
    expect(actor1.id).not.toBe(actor2.id);
  });

  it('should manage actor status correctly', () => {
    const machine = createTestMachine();
    const actor = new Actor(machine);

    // Initial status should be active
    expect(actor.getSnapshot().status).toBe('active');

    // Stop the actor
    actor.stop();
    expect(actor.getSnapshot().status).toBe('stopped');

    // Start the actor again
    actor.start();
    expect(actor.getSnapshot().status).toBe('active');
  });

  it('should not process events when stopped', () => {
    const machine = createTestMachine();
    const actor = new Actor(machine);
    actor.start();
    // Stop the actor
    actor.stop();

    // Try to send an event
    actor.send({ type: 'INCREMENT' });

    // Context should not change
    expect(actor.getSnapshot().context.value).toBe(0);
  });

  it('should handle subscription cleanup correctly', () => {
    const machine = createTestMachine();
    const actor = new Actor(machine);

    actor.start();
    const callback = vi.fn();
    const unsubscribe = actor.subscribe(callback);

    // Should be called once immediately with initial state
    expect(callback).toHaveBeenCalledTimes(1);

    // Send an event
    actor.send({ type: 'INCREMENT' });
    expect(callback).toHaveBeenCalledTimes(2);

    // Unsubscribe
    unsubscribe();

    // Send another event
    actor.send({ type: 'INCREMENT' });

    // Callback should not be called again
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('should cache snapshots correctly', () => {
    const machine = createTestMachine();
    const actor = new Actor(machine);

    const snapshot1 = actor.getSnapshot();
    const snapshot2 = actor.getSnapshot();

    // Same snapshot should be returned when no changes occurred
    expect(snapshot1).toBe(snapshot2);

    // After state change, should get a new snapshot
    actor.send({ type: 'INCREMENT' });
    const snapshot3 = actor.getSnapshot();

    expect(snapshot3).not.toBe(snapshot1);
    expect(snapshot3.context.value).toBe(1);
  });

  it('should implement matches correctly', () => {
    const machine = createTestMachine();
    const actor = new Actor(machine);

    expect(actor.matches('idle')).toBe(true);
    // @ts-expect-error - nonexistent state
    expect(actor.matches('nonexistent')).toBe(false);
  });

  it('should expose can as a pure machine query', () => {
    const machine = createTestMachine();
    const actor = new Actor(machine);

    expect(machine.can(actor.getSnapshot(), { type: 'INCREMENT' })).toBe(true);
    expect(machine.can(actor.getSnapshot(), { type: 'NONEXISTENT' as any })).toBe(false);
  });

  it('should execute runtime actions with the context resolved by machine-side assign actions', () => {
    const seenValues: number[] = [];

    const machine = setup({
      types: {} as { context: TestContext; events: TestEvents },
    }).createMachine({
      id: 'test',
      initial: 'idle',
      context: { value: 0 },
      states: {
        idle: {
          on: {
            INCREMENT: {
              actions: [
                assign(({ context }) => ({
                  value: context.value + 1,
                })),
                {
                  type: 'logValue',
                  exec: ({ context }) => {
                    seenValues.push(context.value);
                  },
                },
              ],
            },
          },
        },
      },
    });

    const actor = new Actor(machine);
    actor.send({ type: 'INCREMENT' });

    expect(actor.getSnapshot().context.value).toBe(1);
    expect(seenValues).toEqual([1]);
  });

  it('should execute initial runtime actions with the context resolved by machine-side assign actions', () => {
    const seenValues: number[] = [];

    const machine = setup({
      types: {} as { context: TestContext; events: TestEvents },
    }).createMachine({
      id: 'test',
      initial: 'idle',
      context: { value: 0 },
      states: {
        idle: {
          entry: [
            assign(({ context }) => ({
              value: context.value + 3,
            })),
            {
              type: 'logInitialValue',
              exec: ({ context }) => {
                seenValues.push(context.value);
              },
            },
          ],
        },
      },
    });

    const actor = new Actor(machine);

    expect(actor.getSnapshot().context.value).toBe(3);
    expect(seenValues).toEqual([3]);
  });

  it('should run generic actor logic implementations, not only state machines', () => {
    const seenValues: number[] = [];

    const logic: ActorLogic<TestContext, TestEvents, TestState> = {
      getInitialTransition: () => ({
        snapshot: {
          value: 'idle',
          context: { value: 0 },
          status: 'active',
        },
        actions: [
          {
            type: 'logInitialValue',
            exec: ({ context }) => {
              seenValues.push(context.value);
            },
          },
        ],
      }),
      transition: (snapshot, event) => {
        if (event.type !== 'INCREMENT') {
          return undefined;
        }

        return {
          snapshot: {
            value: 'idle',
            context: { value: snapshot.context.value + 2 },
            status: snapshot.status,
          },
          actions: [
            {
              type: 'logUpdatedValue',
              exec: ({ context }) => {
                seenValues.push(context.value);
              },
            },
          ],
        };
      },
    };

    const actor = new Actor(logic);

    expect(actor.getSnapshot().context.value).toBe(0);
    expect(seenValues).toEqual([0]);

    actor.send({ type: 'INCREMENT', amount: 1 });

    expect(actor.getSnapshot().context.value).toBe(2);
    expect(seenValues).toEqual([0, 2]);
  });

});
