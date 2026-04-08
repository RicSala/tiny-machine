import { StateMachine } from './StateMachine';
import {
  MachineContext,
  EventObject,
  ActorRef,
  Snapshot,
  TransitionResult,
  Action,
} from './types';

/**
 * Responsibilities:
 * - Executes the logic of the machine
 * - Holdes the state of the running instance (context, status)
 * - Manages subscriptions and notifications
 * - Makes sure events are processed in order
 */
export class Actor<
  TContext extends MachineContext,
  TEvent extends EventObject,
  TStateValue extends string
> implements ActorRef<TContext, TEvent, TStateValue>
{
  public readonly id: string;
  private snapshot: Snapshot<TContext, TStateValue>;
  private machine: StateMachine<TContext, TEvent, TStateValue>;
  private subscribers: Set<(snapshot: Snapshot<TContext, TStateValue>) => void>;
  private lastSnapshot: Snapshot<TContext, TStateValue> | null = null;

  constructor(
    machine: StateMachine<TContext, TEvent, TStateValue>,
    id: string = crypto.randomUUID()
  ) {
    this.id = id;
    this.machine = machine;
    this.snapshot = machine.getInitialSnapshot();
    this.subscribers = new Set();

    // check initial state entry actions
    const initialState =
      this.machine.config.states[this.machine.config.initial];
    if (initialState.entry) {
      const actions = Array.isArray(initialState.entry)
        ? initialState.entry
        : [initialState.entry];
      actions.forEach((action: Action<TContext, TEvent, TStateValue>) => {
        action.exec({
          context: this.machine.config.context,
          event: { type: '$init' } as TEvent,
          self: this,
        });
      });
    }
  }

  getSnapshot = (): Snapshot<TContext, TStateValue> => {
    if (this.lastSnapshot !== null) {
      return this.lastSnapshot;
    }

    // Create new snapshot only when needed
    this.lastSnapshot = {
      value: this.snapshot.value,
      context: { ...this.snapshot.context },
      status: this.snapshot.status,
    };

    return this.lastSnapshot;
  };

  private notify(): void {
    if (this.subscribers.size === 0) return;

    // Invalidate cache before notifying subscribers
    this.lastSnapshot = null;

    // Get the snapshot (which will create a new one)
    const snapshot = this.getSnapshot();

    this.subscribers.forEach((subscriber) => {
      try {
        subscriber(snapshot);
      } catch (error) {
        console.error('Error in subscriber:', error);
      }
    });
  }

  subscribe = (
    callback: (snapshot: Snapshot<TContext, TStateValue>) => void
  ): (() => void) => {
    // Add the subscriber first
    this.subscribers.add(callback);

    // Send initial notification immediately
    try {
      callback(this.getSnapshot());
    } catch (error) {
      console.error('Error in initial subscriber notification:', error);
    }

    return () => {
      // cleanup subscription
      this.subscribers.delete(callback);
    };
  };

  send = (event: TEvent): void => {
    if (this.snapshot.status !== 'active') {
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          `Event "${event.type}" was sent to stopped actor "${this.id}"`
        );
      }
      return;
    }

    try {
      // Get next state and actions (pure computation)
      const result:
        | TransitionResult<TContext, TStateValue, TEvent>
        | undefined = this.machine.transition(this.snapshot, event);

      if (!result) {
        return;
      }

      // Execute actions and update context
      const newContext = this.executeActions(result.actions, event);

      // Invalidate cache before updating snapshot
      this.lastSnapshot = null;

      // Update snapshot
      const nextSnapshot: Snapshot<TContext, TStateValue> = {
        status: this.snapshot.status,
        value: result.value,
        context: newContext,
      };

      this.snapshot = nextSnapshot;
      this.notify();
    } catch (error) {
      this.handleError(error);
    }
  };

  matches = (stateValue: TStateValue): boolean => {
    return this.snapshot.value === stateValue;
  };

  can = (event: TEvent): boolean => {
    const transition = this.machine.transition(this.snapshot, event);
    return !!transition;
  };

  start = (): void => {
    if (this.snapshot.status !== 'active') {
      // Invalidate cache before updating status
      this.lastSnapshot = null;

      this.snapshot = {
        ...this.snapshot,
        status: 'active',
      };
      this.notify();
    }
  };

  stop = (): void => {
    if (this.snapshot.status !== 'stopped') {
      // Invalidate cache before updating status
      this.lastSnapshot = null;

      this.snapshot = {
        ...this.snapshot,
        status: 'stopped',
      };
      this.notify();
    }
  };

  private executeActions(
    actions: Action<TContext, TEvent, TStateValue>[],
    event: TEvent
  ): TContext {
    let context = { ...this.snapshot.context };

    actions.forEach((action) => {
      // assign actions updates the context
      if (action.type === 'xstate.assign') {
        const updates = action.exec({
          context,
          event,
          self: this,
        });
        context = { ...context, ...updates };
      } else {
        // other actions just execute
        action.exec({ context, event, self: this });
      }
    });

    return context;
  }

  private handleError = (error: unknown): void => {
    this.snapshot = {
      ...this.snapshot,
      status: 'error',
    };
    this.notify();
  };
}
