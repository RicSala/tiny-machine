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
export interface Guard<
  TContext extends MachineContext,
  TEvent extends EventObject
> {
  type: string;
  condition: (context: TContext, event: TEvent) => boolean;
}

export interface ActionArgs<
  TContext extends MachineContext,
  TEvent extends EventObject,
  TStateValue extends string
> {
  context: TContext;
  event: TEvent;
  self: ActorRef<TContext, TEvent, TStateValue>;
}

export interface Action<
  TContext extends MachineContext,
  TEvent extends EventObject,
  TStateValue extends string
> {
  type: string;
  exec: (
    args: ActionArgs<TContext, TEvent, TStateValue>
  ) => void | Record<string, any>;
}

export interface TransitionConfig<
  TContext extends MachineContext,
  TEvent extends EventObject,
  TStateValue extends string
> {
  target?: NoInfer<TStateValue>;
  guards?: Guard<TContext, TEvent>[];
  actions?: Action<TContext, TEvent, NoInfer<TStateValue>>[];
  reenter?: boolean;
}

export interface StateNodeConfig<
  TContext extends MachineContext,
  TEvent extends EventObject,
  TStateValue extends string
> {
  on?: {
    [K in TEvent['type']]?: TransitionConfig<TContext, TEvent, TStateValue>;
  };
  entry?: Action<TContext, TEvent, NoInfer<TStateValue>>[];
  exit?: Action<TContext, TEvent, NoInfer<TStateValue>>[];
}

export interface MachineConfig<
  TContext extends MachineContext,
  TEvent extends EventObject,
  TStateValue extends string
> {
  id: string;
  initial: NoInfer<TStateValue>;
  context: TContext;
  on?: {
    [K in TEvent['type']]?: TransitionConfig<TContext, TEvent, TStateValue>;
  };
  states: Record<TStateValue, StateNodeConfig<TContext, TEvent, TStateValue>>;
}

export interface Snapshot<
  TContext extends MachineContext,
  TStateValue extends string
> {
  value: TStateValue;
  context: TContext;
  status: 'active' | 'done' | 'error' | 'stopped';
}

// ACTOR TYPES

export interface ActorRef<
  TContext extends MachineContext,
  TEvent extends EventObject,
  TStateValue extends string
> {
  id: string;
  send: (event: TEvent) => void;
  getSnapshot: () => Snapshot<TContext, TStateValue>;
  subscribe: (
    callback: (snapshot: Snapshot<TContext, TStateValue>) => void
  ) => () => void;
  start: () => void;
  stop: () => void;
  matches: (stateValue: TStateValue) => boolean;
  // TODO: This should not be here.
  can: (event: TEvent) => boolean;
}

export interface TransitionResult<
  TContext extends MachineContext,
  TStateValue extends string,
  TEvent extends EventObject
> {
  value: TStateValue;
  actions: Array<Action<TContext, TEvent, TStateValue>>;
}
