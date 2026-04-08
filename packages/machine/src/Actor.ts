import { StateMachine } from "./StateMachine";
import {
  MachineContext,
  EventObject,
  ActorRef,
  Snapshot,
  TransitionResult,
  Action,
} from "./types";

const INIT_EVENT_TYPE = "$init";

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
  TStateValue extends string,
> implements ActorRef<TContext, TEvent, TStateValue> {
  public readonly id: string;
  private snapshot: Snapshot<TContext, TStateValue>;
  private machine: StateMachine<TContext, TEvent, TStateValue>;
  private subscribers: Set<(snapshot: Snapshot<TContext, TStateValue>) => void>;
  private lastSnapshot: Snapshot<TContext, TStateValue> | null = null;

  constructor(
    machine: StateMachine<TContext, TEvent, TStateValue>,
    id: string = crypto.randomUUID(),
  ) {
    this.id = id;
    this.machine = machine;
    this.subscribers = new Set();
    const initialTransition = this.machine.getInitialTransition();
    this.snapshot = initialTransition.snapshot;
    this.executeActions(initialTransition.actions, { type: INIT_EVENT_TYPE } as TEvent);
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
        console.error("Error in subscriber:", error);
      }
    });
  }

  subscribe = (
    callback: (snapshot: Snapshot<TContext, TStateValue>) => void,
  ): (() => void) => {
    // Add the subscriber first
    this.subscribers.add(callback);

    // Send initial notification immediately
    try {
      callback(this.getSnapshot());
    } catch (error) {
      console.error("Error in initial subscriber notification:", error);
    }

    return () => {
      // cleanup subscription
      this.subscribers.delete(callback);
    };
  };

  send = (event: TEvent): void => {
    if (this.snapshot.status !== "active") {
      if (process.env.NODE_ENV === "development") {
        console.warn(
          `Event "${event.type}" was sent to stopped actor "${this.id}"`,
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

      // Invalidate cache before updating snapshot
      this.lastSnapshot = null;

      this.snapshot = result.snapshot;
      this.executeActions(result.actions, event);
      this.notify();
    } catch (error) {
      this.handleError(error);
    }
  };

  matches = (stateValue: TStateValue): boolean => {
    return this.snapshot.value === stateValue;
  };

  start = (): void => {
    if (this.snapshot.status !== "active") {
      // Invalidate cache before updating status
      this.lastSnapshot = null;

      this.snapshot = {
        ...this.snapshot,
        status: "active",
      };
      this.notify();
    }
  };

  stop = (): void => {
    if (this.snapshot.status !== "stopped") {
      // Invalidate cache before updating status
      this.lastSnapshot = null;

      this.snapshot = {
        ...this.snapshot,
        status: "stopped",
      };
      this.notify();
    }
  };

  private executeActions(
    actions: Action<TContext, TEvent, TStateValue>[],
    event: TEvent,
  ): void {
    actions.forEach((action) => {
      action.exec({
        context: this.snapshot.context,
        event,
        self: this,
      });
    });
  }

  private handleError = (error: unknown): void => {
    this.snapshot = {
      ...this.snapshot,
      status: "error",
    };
    this.notify();
  };
}
