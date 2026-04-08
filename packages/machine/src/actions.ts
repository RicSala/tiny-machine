import { Action, ActionArgs, MachineContext } from './types';

import { EventObject } from './types';

// actions.ts
export function assign<
  TContext extends MachineContext,
  TEvent extends EventObject
>(
  assignment: (context: TContext, event: TEvent) => Partial<TContext>
): Action<TContext, TEvent, any> {
  return {
    type: 'xstate.assign',
    exec: ({ context, event }) => {
      return assignment(context, event);
    },
  };
}
