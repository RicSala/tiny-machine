import { assign as genericAssign } from "./actions";
import {
  Action,
  ActorLogic,
  InitialTransitionResult,
  TransitionConfig,
  TransitionResult,
} from "./types";

import { MachineContext, EventObject, MachineConfig, Snapshot } from "./types";

const ASSIGN_ACTION_TYPE = "tinymachine.assign";

/**
 * Responsibilities:
 * - Define the machine configuration
 * - Defines how to transition from one state to another
 * All _pure_ calculations.
 */
export class StateMachine<
  TContext extends MachineContext,
  TEvent extends EventObject,
  TStateValue extends string,
> implements ActorLogic<TContext, TEvent, TStateValue> {
  constructor(readonly config: MachineConfig<TContext, TEvent, TStateValue>) {}

  private resolveActions(
    baseContext: TContext,
    event: TEvent,
    actions: Action<TContext, TEvent, TStateValue>[],
  ): {
    context: TContext;
    runtimeActions: Action<TContext, TEvent, TStateValue>[];
  } {
    let context = { ...baseContext };
    const runtimeActions: Action<TContext, TEvent, TStateValue>[] = [];

    actions.forEach((action) => {
      if (action.type === ASSIGN_ACTION_TYPE) {
        const updates = action.exec({
          context,
          event,
          self: undefined as never,
        });
        context = { ...context, ...updates };
        return;
      }

      const actionContext = context;
      runtimeActions.push({
        type: action.type,
        exec: ({ event, self }) =>
          action.exec({
            context: actionContext,
            event,
            self,
          }),
      });
    });

    return {
      context,
      runtimeActions,
    };
  }

  private normalizeTransitions(
    definition:
      | TransitionConfig<TContext, TEvent, TStateValue>
      | TransitionConfig<TContext, TEvent, TStateValue>[]
      | undefined,
  ): TransitionConfig<TContext, TEvent, TStateValue>[] {
    if (!definition) {
      return [];
    }

    return Array.isArray(definition) ? definition : [definition];
  }

  private selectTransition(
    transitions: TransitionConfig<TContext, TEvent, TStateValue>[],
    event: TEvent,
    context: TContext,
  ): TransitionConfig<TContext, TEvent, TStateValue> | undefined {
    return transitions.find((transition) => {
      if (!transition.guard) return true;

      return transition.guard(context, event);
    });
  }

  private getTransitionConfig(
    state: TStateValue,
    event: TEvent,
    context: TContext,
  ) {
    const stateNode = this.config.states[state];
    const stateTransitions = this.normalizeTransitions(
      stateNode.on?.[event.type as TEvent["type"]],
    );
    const stateTransition = this.selectTransition(
      stateTransitions,
      event,
      context,
    );

    if (stateTransition) return stateTransition;

    const rootTransitions = this.normalizeTransitions(
      this.config.on?.[event.type as TEvent["type"]],
    );

    return this.selectTransition(rootTransitions, event, context);
  }

  getInitialSnapshot(): Snapshot<TContext, TStateValue> {
    return {
      status: "active",
      context: { ...this.config.context },
      value: this.config.initial,
    };
  }

  getInitialTransition(): InitialTransitionResult<
    TContext,
    TStateValue,
    TEvent
  > {
    const initialSnapshot = this.getInitialSnapshot();
    const initialState = this.config.states[this.config.initial];
    const actions = initialState.entry
      ? Array.isArray(initialState.entry)
        ? initialState.entry
        : [initialState.entry]
      : [];
    const resolvedInitial = this.resolveActions(
      initialSnapshot.context,
      { type: "$init" } as TEvent,
      actions,
    );

    return {
      snapshot: {
        ...initialSnapshot,
        context: resolvedInitial.context,
      },
      actions: resolvedInitial.runtimeActions,
    };
  }

  /**
   * Transitions the machine from the current state to the target state.
   * @returns The new state and the actions to execute
   */
  transition(
    snapshot: Snapshot<TContext, TStateValue>,
    event: TEvent,
  ): TransitionResult<TContext, TStateValue, TEvent> | undefined {
    const currentState = snapshot.value;
    const transition = this.getTransitionConfig(
      currentState,
      event,
      snapshot.context,
    );
    if (!transition) {
      return undefined;
    }

    const targetState = transition.target || currentState;
    const actions: Action<TContext, TEvent, TStateValue>[] = [];

    const shouldRunExitActions =
      targetState !== currentState || transition.reenter;
    // Collect exit actions
    if (shouldRunExitActions) {
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

    const shouldRunEntryActions =
      targetState !== currentState || transition.reenter;
    // Collect entry actions
    if (shouldRunEntryActions) {
      const targetStateNode = this.config.states[targetState];
      if (targetStateNode?.entry) {
        const entryActions = Array.isArray(targetStateNode.entry)
          ? targetStateNode.entry
          : [targetStateNode.entry];
        actions.push(...entryActions);
      }
    }

    const resolvedActions = this.resolveActions(snapshot.context, event, actions);

    return {
      snapshot: {
        status: snapshot.status,
        value: targetState,
        context: resolvedActions.context,
      },
      actions: resolvedActions.runtimeActions,
    };
  }

  can(snapshot: Snapshot<TContext, TStateValue>, event: TEvent): boolean {
    return !!this.transition(snapshot, event);
  }
}

export function setup<
  TContext extends MachineContext,
  TEvent extends EventObject,
>(_options: { types: { context?: TContext; events?: TEvent } }) {
  return {
    createMachine<TState extends string>(
      config: MachineConfig<TContext, TEvent, TState>,
    ) {
      return new StateMachine(
        config as MachineConfig<TContext, TEvent, TState>,
      );
    },

    assign(
      fn: (args: { context: TContext; event: TEvent }) => Partial<TContext>,
    ): Action<TContext, TEvent, any> {
      return genericAssign<TContext, TEvent>(fn);
    },
  };
}
