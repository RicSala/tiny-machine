import { describe, it, expectTypeOf } from 'vitest';
import { setup } from '../../src/StateMachine';
import { Actor } from '../../src/Actor';

describe('Actor Type Safety', () => {
  // Define test types
  interface TestContext {
    count: number;
    name: string;
  }

  type TestEvent = { type: 'INCREMENT'; amount: number } | { type: 'RESET' };

  const testSetup = setup({
    types: {} as { context: TestContext; events: TestEvent },
  });

  const createTestMachine = () =>
    testSetup.createMachine({
      id: 'test',
      initial: 'idle',
      context: { count: 0, name: 'test' },
      states: {
        idle: {
          on: {
            INCREMENT: { target: 'active' },
          },
        },
        active: {
          on: {
            RESET: { target: 'idle' },
          },
        },
      },
    });

  describe('Actor.getSnapshot()', () => {
    it('should return properly typed Snapshot', () => {
      const machine = createTestMachine();
      const actor = new Actor(machine);
      const snapshot = actor.getSnapshot();

      expectTypeOf(snapshot).not.toBeAny();
      expectTypeOf(snapshot.context).toEqualTypeOf<TestContext>();
      expectTypeOf(snapshot.context).not.toBeAny();
    });

    it('snapshot.value should be the state union, not string', () => {
      const machine = createTestMachine();
      const actor = new Actor(machine);
      const snapshot = actor.getSnapshot();

      expectTypeOf(snapshot.value).toEqualTypeOf<'idle' | 'active'>();
      expectTypeOf(snapshot.value).not.toBeAny();
    });

    it('snapshot.status should be the status union', () => {
      const machine = createTestMachine();
      const actor = new Actor(machine);
      const snapshot = actor.getSnapshot();

      expectTypeOf(snapshot.status).toEqualTypeOf<
        'active' | 'done' | 'error' | 'stopped'
      >();
    });
  });

  describe('Actor.send()', () => {
    it('should accept valid events', () => {
      const machine = createTestMachine();
      const actor = new Actor(machine);

      // These should compile without error
      actor.send({ type: 'INCREMENT', amount: 1 });
      actor.send({ type: 'RESET' });
    });

    it('event parameter should be TestEvent, not any', () => {
      const machine = createTestMachine();
      const actor = new Actor(machine);

      expectTypeOf(actor.send).parameter(0).toEqualTypeOf<TestEvent>();
      expectTypeOf(actor.send).parameter(0).not.toBeAny();
    });
  });

  describe('Actor.matches()', () => {
    it('should accept valid state values', () => {
      const machine = createTestMachine();
      const actor = new Actor(machine);

      // These should compile without error
      const isIdle = actor.matches('idle');
      const isActive = actor.matches('active');

      expectTypeOf(isIdle).toEqualTypeOf<boolean>();
      expectTypeOf(isActive).toEqualTypeOf<boolean>();
    });

    it('parameter should be the state union, not string', () => {
      const machine = createTestMachine();
      const actor = new Actor(machine);

      expectTypeOf(actor.matches).parameter(0).toEqualTypeOf<'idle' | 'active'>();
      expectTypeOf(actor.matches).parameter(0).not.toBeAny();
    });
  });

  describe('Actor.can()', () => {
    it('should accept valid events', () => {
      const machine = createTestMachine();
      const actor = new Actor(machine);

      const canIncrement = actor.can({ type: 'INCREMENT', amount: 1 });
      const canReset = actor.can({ type: 'RESET' });

      expectTypeOf(canIncrement).toEqualTypeOf<boolean>();
      expectTypeOf(canReset).toEqualTypeOf<boolean>();
    });

    it('parameter should be TestEvent, not any', () => {
      const machine = createTestMachine();
      const actor = new Actor(machine);

      expectTypeOf(actor.can).parameter(0).toEqualTypeOf<TestEvent>();
      expectTypeOf(actor.can).parameter(0).not.toBeAny();
    });
  });

  describe('Actor.subscribe()', () => {
    it('callback should receive properly typed snapshot', () => {
      const machine = createTestMachine();
      const actor = new Actor(machine);

      actor.subscribe((snapshot) => {
        expectTypeOf(snapshot).not.toBeAny();
        expectTypeOf(snapshot.context).toEqualTypeOf<TestContext>();
        expectTypeOf(snapshot.value).toEqualTypeOf<'idle' | 'active'>();
      });
    });

    it('should return an unsubscribe function', () => {
      const machine = createTestMachine();
      const actor = new Actor(machine);

      const unsubscribe = actor.subscribe(() => {});

      expectTypeOf(unsubscribe).toEqualTypeOf<() => void>();
    });
  });

  describe('Negative Tests', () => {
    it('send should not accept invalid event types', () => {
      const machine = createTestMachine();
      const actor = new Actor(machine);

      // @ts-expect-error - 'INVALID' is not a valid event type
      actor.send({ type: 'INVALID' });
    });

    it('send should not accept events with missing required properties', () => {
      const machine = createTestMachine();
      const actor = new Actor(machine);

      // @ts-expect-error - INCREMENT requires 'amount' property
      actor.send({ type: 'INCREMENT' });
    });

    it('matches should not accept invalid state values', () => {
      const machine = createTestMachine();
      const actor = new Actor(machine);

      // @ts-expect-error - 'invalid' is not a valid state
      actor.matches('invalid');
    });

    it('matches should not accept numbers', () => {
      const machine = createTestMachine();
      const actor = new Actor(machine);

      // @ts-expect-error - state must be a string, not number
      actor.matches(123);
    });

    it('can should not accept invalid event types', () => {
      const machine = createTestMachine();
      const actor = new Actor(machine);

      // @ts-expect-error - 'INVALID' is not a valid event type
      actor.can({ type: 'INVALID' });
    });
  });
});
