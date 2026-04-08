import { describe, it, expectTypeOf } from 'vitest';
import { setup } from '../../src/StateMachine';

describe('StateMachine Type Safety', () => {
  // Define test types
  interface TestContext {
    count: number;
    name: string;
  }

  type TestEvent = { type: 'INCREMENT'; amount: number } | { type: 'RESET' };

  const testSetup = setup({
    types: {} as { context: TestContext; events: TestEvent },
  });

  describe('setup().assign()', () => {
    it('context parameter should be TestContext, not any', () => {
      testSetup.assign((ctx, evt) => {
        expectTypeOf(ctx).toEqualTypeOf<TestContext>();
        expectTypeOf(ctx).not.toBeAny();
        return {};
      });
    });

    it('event parameter should be TestEvent, not any', () => {
      testSetup.assign((ctx, evt) => {
        expectTypeOf(evt).toEqualTypeOf<TestEvent>();
        expectTypeOf(evt).not.toBeAny();
        return {};
      });
    });
  });

  describe('setup().createMachine()', () => {
    it('should infer states from states object keys', () => {
      const machine = testSetup.createMachine({
        id: 'test',
        initial: 'idle',
        context: { count: 0, name: 'test' },
        states: {
          idle: {},
          active: {},
        },
      });

      type StateValue = ReturnType<typeof machine.getInitialSnapshot>['value'];
      expectTypeOf<StateValue>().toEqualTypeOf<'idle' | 'active'>();
    });
  });

  describe('Negative Tests', () => {
    it('target should not accept numbers', () => {
      testSetup.createMachine({
        id: 'test',
        initial: 'idle',
        context: { count: 0, name: 'test' },
        states: {
          idle: {
            on: {
              INCREMENT: {
                // @ts-expect-error - target must be a state name, not number
                target: 123,
              },
            },
          },
        },
      });
    });

    it('initial should not accept undefined states', () => {
      testSetup.createMachine({
        id: 'test',
        // @ts-expect-error - 'nonexistent' is not a defined state
        initial: 'nonexistent',
        context: { count: 0, name: 'test' },
        states: {
          idle: {},
        },
      });
    });

    it('assign should not accept wrong context properties', () => {
      // @ts-expect-error - 'invalid' is not a property of TestContext
      testSetup.assign((ctx) => {
        return { invalid: 123 };
      });
    });
  });
});
