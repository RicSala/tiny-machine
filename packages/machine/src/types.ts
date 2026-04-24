import { ASSIGN_ACTION_TYPE } from "./actions";

export type EventObject<TType extends string = string> = {
  type: TType;
  [key: string]: any;
};
export type MachineContext = Record<string, any>;

/**
 * Prevents TypeScript from inferring a type from this position.
 * Use when you want a type to be validated but not used as an inference source.
 * Built-in from TS 5.4, this is a polyfill for earlier versions.
 */
export type NoInfer<T> = [T][T extends any ? 0 : never];

// MACHINE TYPES
export type Guard<
  TContext extends MachineContext,
  TEvent extends EventObject,
> = (args: { context: TContext; event: TEvent }) => boolean;

export interface ActionArgs<
  TContext extends MachineContext,
  TEvent extends EventObject,
  TStateValue extends string,
> {
  context: TContext;
  event: TEvent;
  self: ActorRef<TContext, TEvent, TStateValue>;
}

export type ActionFunction<
  TContext extends MachineContext,
  TEvent extends EventObject,
  TStateValue extends string,
> = (args: ActionArgs<TContext, TEvent, TStateValue>) => void;

export interface AssignAction<
  TContext extends MachineContext,
  TEvent extends EventObject,
> {
  type: typeof ASSIGN_ACTION_TYPE;
  assignment: (
    args: Pick<ActionArgs<TContext, TEvent, any>, "context" | "event">,
  ) => Partial<TContext>;
}

export type Action<
  TContext extends MachineContext,
  TEvent extends EventObject,
  TStateValue extends string,
> =
  | ActionFunction<TContext, TEvent, TStateValue>
  | AssignAction<TContext, TEvent>;

export type RuntimeAction<
  TContext extends MachineContext,
  TEvent extends EventObject,
  TStateValue extends string,
> = ActionFunction<TContext, TEvent, TStateValue>;

export interface TransitionConfig<
  TContext extends MachineContext,
  TEvent extends EventObject,
  TStateValue extends string,
> {
  target?: NoInfer<TStateValue>;
  guard?: Guard<TContext, TEvent>;
  actions?: Action<TContext, TEvent, NoInfer<TStateValue>>[];
  reenter?: boolean;
}

export interface StateNodeConfig<
  TContext extends MachineContext,
  TEvent extends EventObject,
  TStateValue extends string,
> {
  on?: {
    [K in TEvent["type"]]?:
      | TransitionConfig<TContext, TEvent, TStateValue>
      | TransitionConfig<TContext, TEvent, TStateValue>[];
  };
  entry?: Action<TContext, TEvent, NoInfer<TStateValue>>[];
  exit?: Action<TContext, TEvent, NoInfer<TStateValue>>[];
}

export interface MachineConfig<
  TContext extends MachineContext,
  TEvent extends EventObject,
  TStateValue extends string,
> {
  id: string;
  initial: NoInfer<TStateValue>;
  context: TContext;
  on?: {
    [K in TEvent["type"]]?:
      | TransitionConfig<TContext, TEvent, TStateValue>
      | TransitionConfig<TContext, TEvent, TStateValue>[];
  };
  states: Record<TStateValue, StateNodeConfig<TContext, TEvent, TStateValue>>;
}

export interface Snapshot<
  TContext extends MachineContext,
  TStateValue extends string,
> {
  value: TStateValue;
  context: TContext;
  status: "active" | "done" | "error" | "stopped";
}

// ACTOR TYPES

export interface ActorRef<
  TContext extends MachineContext,
  TEvent extends EventObject,
  TStateValue extends string,
> {
  id: string;
  send: (event: TEvent) => void;
  getSnapshot: () => Snapshot<TContext, TStateValue>;
  subscribe: (
    callback: (snapshot: Snapshot<TContext, TStateValue>) => void,
  ) => () => void;
  start: () => void;
  stop: () => void;
  matches: (stateValue: TStateValue) => boolean;
}

export interface ActorLogic<
  TContext extends MachineContext,
  TEvent extends EventObject,
  TStateValue extends string,
> {
  getInitialTransition: () => InitialTransitionResult<
    TContext,
    TStateValue,
    TEvent
  >;
  transition: (
    snapshot: Snapshot<TContext, TStateValue>,
    event: TEvent,
  ) => TransitionResult<TContext, TStateValue, TEvent> | undefined;
}

export interface TransitionResult<
  TContext extends MachineContext,
  TStateValue extends string,
  TEvent extends EventObject,
> {
  snapshot: Snapshot<TContext, TStateValue>;
  actions: Array<RuntimeAction<TContext, TEvent, TStateValue>>;
}

export interface InitialTransitionResult<
  TContext extends MachineContext,
  TStateValue extends string,
  TEvent extends EventObject,
> {
  snapshot: Snapshot<TContext, TStateValue>;
  actions: Array<RuntimeAction<TContext, TEvent, TStateValue>>;
}
