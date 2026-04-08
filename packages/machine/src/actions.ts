import { Action, ActionArgs, MachineContext } from "./types";

import { EventObject } from "./types";

const ASSIGN_ACTION_TYPE = "tinymachine.assign";

// actions.ts
export function assign<
  TContext extends MachineContext,
  TEvent extends EventObject,
>(
  assignment: (
    args: Pick<ActionArgs<TContext, TEvent, any>, "context" | "event">,
  ) => Partial<TContext>,
): Action<TContext, TEvent, any> {
  return {
    type: ASSIGN_ACTION_TYPE,
    exec: ({ context, event }) => {
      return assignment({ context, event });
    },
  };
}
