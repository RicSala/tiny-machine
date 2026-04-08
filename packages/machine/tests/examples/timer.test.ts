import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { StateMachine, setup } from '../../src/StateMachine';
import { assign } from '../../src/actions';
import { MachineConfig } from '../../src/types';
import { Actor } from '../../src/Actor';

interface TimerContext {
  duration: number;
  elapsed: number;
  interval: number | null;
}

type TimerState = 'idle' | 'ready' | 'running' | 'paused';

type TimerEvent =
  | { type: 'INITIALIZE'; duration: number }
  | { type: 'START' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'TICK' };

// Setup with typed context and events - assign will be properly typed
const timerSetup = setup({
  types: {} as {
    context: TimerContext;
    events: TimerEvent;
  },
});

describe('Timer Example', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create a timer machine and handle timer events correctly', () => {
    // Use timerSetup.assign - it's typed with TimerContext and TimerEvent
    const machine = timerSetup.createMachine({
      id: 'timer',
      initial: 'idle',
      context: {
        duration: 0,
        elapsed: 0,
        interval: null,
      },
      states: {
        idle: {
          on: {
            INITIALIZE: {
              target: 'ready',
              actions: [
                assign((_context, event) => {
                  // event is now typed as TimerEvent!
                  if (event.type !== 'INITIALIZE') return {};
                  return {
                    duration: event.duration,
                    interval: null,
                  };
                }),
                {
                  type: 'xstate.assign',
                  exec: ({ context, event, self }) => {
                    if (event.type !== 'INITIALIZE') return {};
                    self.matches('idle');
                    return {
                      duration: event.duration,
                      interval: null,
                    };
                  },
                },
              ],
            },
          },
          entry: [
            assign((_context, _event) => ({
              elapsed: 0,
            })),
            {
              type: 'xstate.assign',
              exec: ({ context, event, self }) => {
                if (event.type !== 'INITIALIZE') return {};
                return {
                  duration: event.duration,
                  interval: null,
                };
              },
            },
          ],
        },
        ready: {
          on: {
            START: {
              target: 'running',
              actions: [
                assign((context) => ({
                  interval: setInterval(() => {
                    // This will be mocked in tests
                  }, 1000) as unknown as number,
                })),
              ],
            },
          },
        },
        running: {
          on: {
            PAUSE: {
              target: 'paused',
              actions: [
                timerSetup.assign((context) => {
                  return { interval: null };
                }),
              ],
            },
            TICK: {
              actions: [
                timerSetup.assign((context) => ({
                  elapsed: context.elapsed + 1,
                })),
              ],
              guards: [
                {
                  type: 'notCompleted',
                  condition: (context) => context.elapsed < context.duration,
                },
              ],
            },
          },
        },
        paused: {
          on: {
            RESUME: {
              target: 'running',
              actions: [
                timerSetup.assign(() => ({
                  interval: setInterval(() => {}, 1000) as unknown as number,
                })),
              ],
            },
          },
        },
      },
    });

    const actor = new Actor(machine);

    // Test initialization
    actor.send({ type: 'INITIALIZE', duration: 60 });
    expect(actor.getSnapshot().value).toBe('ready');
    expect(actor.getSnapshot().context.duration).toBe(60);
    expect(actor.getSnapshot().context.elapsed).toBe(0);

    // Test starting the timer
    actor.send({ type: 'START' });
    expect(actor.getSnapshot().value).toBe('running');
    expect(actor.getSnapshot().context.interval).toBeDefined();

    // Simulate time passing and ticks
    actor.send({ type: 'TICK' });
    expect(actor.getSnapshot().context.elapsed).toBe(1);

    actor.send({ type: 'TICK' });
    expect(actor.getSnapshot().context.elapsed).toBe(2);

    // Test pausing
    actor.send({ type: 'PAUSE' });
    expect(actor.getSnapshot().value).toBe('paused');
    expect(actor.getSnapshot().context.interval).toBeNull();

    // Test resuming
    actor.send({ type: 'RESUME' });
    expect(actor.getSnapshot().value).toBe('running');
    expect(actor.getSnapshot().context.interval).toBeDefined();

    // Cleanup intervals
    clearInterval(actor.getSnapshot().context.interval!);
  });

  it('should not increment elapsed time beyond duration', () => {
    const timerConfig: MachineConfig<TimerContext, TimerEvent, TimerState> = {
      id: 'timer',
      initial: 'idle',
      context: {
        duration: 0,
        elapsed: 0,
        interval: null,
      },
      states: {
        idle: {
          on: {
            INITIALIZE: {
              target: 'ready',
              actions: [
                assign<TimerContext, TimerEvent>((context, event) => {
                  if (event.type !== 'INITIALIZE') return {};
                  return {
                    duration: event.duration,
                    elapsed: 0,
                    interval: null,
                  };
                }),
              ],
            },
          },
        },
        ready: {
          on: {
            START: {
              target: 'running',
              actions: [
                assign<TimerContext, TimerEvent>(() => ({
                  interval: setInterval(() => {
                    // This will be mocked in tests
                  }, 1000) as unknown as number,
                })),
              ],
            },
          },
        },
        running: {
          on: {
            TICK: {
              actions: [
                assign<TimerContext, TimerEvent>((context) => ({
                  elapsed: context.elapsed + 1,
                })),
              ],
              guards: [
                {
                  type: 'notCompleted',
                  condition: (context: TimerContext) =>
                    context.elapsed < context.duration,
                },
              ],
            },
          },
        },
        paused: {
          on: {
            RESUME: {
              target: 'running',
            },
          },
        },
      },
    };

    const machine = new StateMachine(timerConfig);
    const actor = new Actor<TimerContext, TimerEvent, TimerState>(machine);

    // Initialize with 2 seconds duration
    actor.send({ type: 'INITIALIZE', duration: 2 });
    actor.send({ type: 'START' });

    // Simulate 3 ticks (should only count up to 2)
    actor.send({ type: 'TICK' });
    actor.send({ type: 'TICK' });
    actor.send({ type: 'TICK' }); // This should be ignored due to the guard

    expect(actor.getSnapshot().context.elapsed).toBe(2);

    // Cleanup intervals
    clearInterval(actor.getSnapshot().context.interval!);
  });
});
