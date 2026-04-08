import { Action, TransitionResult } from './types';

import { MachineContext, EventObject, MachineConfig, Snapshot } from './types';

/**
 * Responsibilities:
 * - Define the machine configuration
 * - Defines how to transition from one state to another
 * All _pure_ calculations.
 */
export class StateMachine<
  TContext extends MachineContext,
  TEvent extends EventObject,
  TStateValue extends string
> {
  constructor(readonly config: MachineConfig<TContext, TEvent, TStateValue>) {}

  private getTransitionConfig(
    state: TStateValue,
    event: TEvent,
    context: TContext
  ) {
    const stateNode = this.config.states[state];
    let trasitionConfig =
      stateNode.on?.[event.type as keyof typeof stateNode.on];

    const guards = trasitionConfig?.guards;
    const blockingGuards =
      guards?.some((guard) => !guard.condition(context, event)) ?? false;
    if (blockingGuards) return;

    if (trasitionConfig === undefined) {
      trasitionConfig =
        this.config.on?.[event.type as keyof typeof this.config.on];
    }
    return trasitionConfig;
  }

  getInitialSnapshot(): Snapshot<TContext, TStateValue> {
    return {
      status: 'active',
      context: { ...this.config.context },
      value: this.config.initial,
    };
  }

  /**
   * Transitions the machine from the current state to the target state.
   * @returns The new state and the actions to execute
   */
  transition(
    snapshot: Snapshot<TContext, TStateValue>,
    event: TEvent
  ): TransitionResult<TContext, TStateValue, TEvent> | undefined {
    const currentState = snapshot.value;
    const transition = this.getTransitionConfig(
      currentState,
      event,
      snapshot.context
    );
    if (!transition) {
      return undefined;
    }

    const targetState = transition.target || currentState;
    const actions: Action<TContext, TEvent, TStateValue>[] = [];

    // Collect exit actions
    if (targetState !== currentState || transition.reenter) {
      const currentStateNode = this.config.states[currentState];
      if (currentStateNode?.exit) {
        const exitActions = Array.isArray(currentStateNode.exit)
          ? currentStateNode.exit
          : [currentStateNode.exit];
        actions.push(...exitActions);
      }
    }

    // Collect transition actions
    if (transition.actions) {
      const transitionActions = Array.isArray(transition.actions)
        ? transition.actions
        : [transition.actions];
      actions.push(...transitionActions);
    }

    // Collect entry actions
    if (targetState !== currentState || transition.reenter) {
      const targetStateNode = this.config.states[targetState];
      if (targetStateNode?.entry) {
        const entryActions = Array.isArray(targetStateNode.entry)
          ? targetStateNode.entry
          : [targetStateNode.entry];
        actions.push(...entryActions);
      }
    }

    return {
      value: targetState,
      actions,
    };
  }
}

export function setup<
  TContext extends MachineContext,
  TEvent extends EventObject
>(_options: { types: { context?: TContext; events?: TEvent } }) {
  return {
    createMachine<TState extends string>(
      config: MachineConfig<TContext, TEvent, TState>
    ) {
      return new StateMachine(
        config as MachineConfig<TContext, TEvent, TState>
      );
    },

    assign(
      fn: (context: TContext, event: TEvent) => Partial<TContext>
    ): Action<TContext, TEvent, any> {
      return {
        type: 'xstate.assign',
        exec: ({ context, event }) => fn(context, event),
      };
    },
  };
}
