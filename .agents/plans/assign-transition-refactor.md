# Move `assign` context reduction into machine transitions

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

No `PLANS.md` file exists in this repository as of 2026-04-08, so this document is intentionally fully self-contained and must be maintained on its own.

## Purpose / Big Picture

After this change, the machine will compute the full next snapshot during a transition, including the updated context produced by `assign(...)`. The actor will stop deciding which actions mutate context and will instead focus on runtime concerns: storing the new snapshot, executing the remaining side-effect actions, handling subscriptions, and reporting errors. A user should be able to prove this works by running the existing test suite and observing that machine transitions still produce the same visible behavior in the demo app, while the implementation boundary becomes closer to XState’s pure transition model.

The user-visible behavior should not change. The important outcome is architectural: `StateMachine.transition(...)` will become the single source of truth for pure state evolution, and `Actor.send(...)` will become smaller and easier to reason about. This matters because it makes the library easier to extend toward more XState-like behavior later, especially built-in actions such as `raise(...)` and richer transition inspection.

## Progress

- [x] 2026-04-08 11:35Z Created this ExecPlan and captured the current repository context, assumptions, and implementation sequence.
- [x] 2026-04-08 11:35Z Confirmed the repository currently has no `PLANS.md`, so this plan includes all required context inline.
- [ ] Introduce machine-side transition result data that carries a full `Snapshot` rather than only a target state value.
- [ ] Move `assign(...)` reduction from `packages/machine/src/Actor.ts` into `packages/machine/src/StateMachine.ts` while preserving current behavior.
- [ ] Filter runtime actions so the actor executes side effects only after the machine has already computed the next context.
- [ ] Simplify `Actor.send(...)` and constructor initialization to consume machine-produced snapshots consistently.
- [ ] Add and update tests that prove the machine, not the actor, now owns context evolution for `assign(...)`.
- [ ] Run `pnpm test`, `pnpm typecheck`, `pnpm build`, and `pnpm lint` from the repository root and record outcomes in this plan.

## Surprises & Discoveries

- Observation: The repository already moved two pieces of logic out of the actor and into the machine: the `can()` query now lives on `StateMachine`, and initial entry action discovery now lives in `StateMachine.getInitialTransition()`.
  Evidence: `packages/machine/src/StateMachine.ts` now exposes `can(...)` and `getInitialTransition()`, while `packages/machine/src/Actor.ts` no longer inspects `machine.config.states[...]` for initial entry actions.

- Observation: The actor currently still owns part of the pure transition algorithm because `executeActions(...)` applies `ASSIGN_ACTION_TYPE` updates to context before storing the next snapshot.
  Evidence: In `packages/machine/src/Actor.ts`, `send(...)` calls `this.machine.transition(...)`, then immediately calls `this.executeActions(result.actions, event)` to compute `newContext`, and only after that writes `this.snapshot`.

- Observation: The current `TransitionResult` shape is not rich enough for the desired refactor because it only returns `value` and `actions`, not the next `context`.
  Evidence: `packages/machine/src/types.ts` defines `TransitionResult` with:
    `value: TStateValue`
    `actions: Array<Action<...>>`

## Decision Log

- Decision: Keep the public result for the initial machine step object-shaped rather than tuple-shaped.
  Rationale: The user explicitly prefers object returns over array returns, and the current codebase already moved initial step handling in that direction with `getInitialTransition(): { snapshot, actions }`.
  Date/Author: 2026-04-08 / Codex

- Decision: Preserve the current public behavior of `assign(...)` as an action creator instead of replacing it with a separate context-update mechanism.
  Rationale: XState also models `assign(...)` as a built-in action. The architectural goal is not to remove `assign` actions, but to make the machine interpret them during the pure transition step.
  Date/Author: 2026-04-08 / Codex

- Decision: Plan the refactor in two layers: first move `assign` context reduction into the machine while keeping the current `Action` type, and only later consider splitting action types into built-in state actions versus runtime side-effect actions.
  Rationale: This reduces risk and keeps the first change behavior-preserving. A full action-type split is useful, but it is not required to achieve the architectural boundary the user is asking for.
  Date/Author: 2026-04-08 / Codex

- Decision: Treat the actor as a runtime interpreter rather than a source of pure transition semantics.
  Rationale: This aligns better with how XState conceptually separates actor runtime concerns from pure machine transition logic.
  Date/Author: 2026-04-08 / Codex

## Outcomes & Retrospective

This section is intentionally incomplete because implementation has not started yet. At completion, record which files changed, whether the actor is now free of context-reduction logic for `assign(...)`, which tests were added or updated, and whether any follow-up work remains for richer action typing.

## Context and Orientation

This repository is a Turborepo workspace rooted at `machine-turbo/`. The library we are changing lives in `packages/machine/`. The demo app lives in `apps/demo/` and is important because it exercises the public library API and is part of the verification surface.

The files that matter for this refactor are:

- `packages/machine/src/StateMachine.ts`: the pure state machine logic. It currently selects transitions, gathers exit/transition/entry actions, exposes `getInitialSnapshot()`, exposes `getInitialTransition()`, and exposes `can(...)`.
- `packages/machine/src/Actor.ts`: the runtime that holds the live snapshot, subscribes listeners, processes events, executes actions, and currently also applies `assign(...)` updates to context.
- `packages/machine/src/actions.ts`: the built-in `assign(...)` helper and the `ASSIGN_ACTION_TYPE` constant used to recognize assign actions.
- `packages/machine/src/types.ts`: the shared type definitions, especially `Action`, `Snapshot`, `TransitionResult`, and `InitialTransitionResult`.
- `packages/machine/tests/StateMachine.test.ts`: behavioral tests for transitions, entry/exit actions, guards, and array transitions.
- `packages/machine/tests/Actor.test.ts`: runtime tests for snapshot caching, subscriptions, and actor behavior.
- `packages/machine/tests/examples/timer.test.ts`: a realistic machine example that mixes `assign(...)` updates with side effects.
- `packages/machine/tests/types/*.test.ts`: compile-time type tests that will fail if the refactor breaks the public generic API.

Important terms used in this plan:

- A “snapshot” is the immutable view of a running machine at one moment. In this repository it is the `Snapshot<TContext, TStateValue>` object with `value`, `context`, and `status`.
- A “pure transition” means a deterministic calculation that does not cause side effects. Given a snapshot and an event, it should compute the next snapshot the same way every time.
- An “assign action” is a built-in action created by `assign(...)` that returns a partial context update. Today the actor interprets these actions specially by merging their returned data into the current context.
- A “runtime side-effect action” means any action that should still be executed by the actor after the pure next snapshot is known, such as logging, timers, or sending events.

The key architectural issue is easy to state. Right now `StateMachine.transition(...)` tells us which state value to go to and which actions to run, but it does not compute the next context. Then `Actor.send(...)` applies `assign(...)` actions in order to finish computing the next snapshot. This means pure state evolution is split between the machine and the actor. The purpose of this refactor is to make the machine compute the whole next snapshot itself.

XState is the reference point for this change. Conceptually, XState’s pure transition functions produce the next state object, including updated context, and also return the actions associated with that transition. The actor runtime then executes those actions. This plan adopts that same separation without attempting to match every internal XState implementation detail.

## Plan of Work

The first edit is in `packages/machine/src/types.ts`. Replace the current `TransitionResult` shape so that it returns a `snapshot` field instead of a bare `value` field. The new result should be object-shaped and must include the fully computed next `Snapshot<TContext, TStateValue>` plus the list of remaining actions that the actor still needs to execute. Do not remove `InitialTransitionResult`; it already matches the object-shaped direction we want. The goal is for both “initial machine step” and “event-driven machine step” to follow the same design language.

The second edit is in `packages/machine/src/StateMachine.ts`. Add a private helper that reduces assign actions into a new context in a purely functional way. The helper should accept a base context, an event, and an ordered list of actions. It should iterate in order, and whenever it encounters an action whose `type` equals `ASSIGN_ACTION_TYPE`, it should run that action with the current pure context and merge the returned partial update into a new context object. It must not execute non-assign actions for side effects. It should simply ignore those when computing the next context. This helper belongs in the machine because it is now part of the pure state transition algorithm.

Still in `packages/machine/src/StateMachine.ts`, update `transition(...)` so it does three things in order. First, it keeps the existing transition selection and action collection logic. Second, it computes `nextContext` by running the new pure helper over the collected actions. Third, it filters the action list to remove assign actions before returning the result. The returned object should look like:

    {
      snapshot: {
        status: snapshot.status,
        value: targetState,
        context: nextContext,
      },
      actions: runtimeActions,
    }

Here “runtimeActions” means the same action list as before, but without assign actions, because those were already interpreted during the pure transition step.

The third edit is in `packages/machine/src/Actor.ts`. Remove the actor’s responsibility for computing new context during `send(...)`. After the refactor, `send(...)` should call `this.machine.transition(...)`, bail out if the result is undefined, assign `this.snapshot = result.snapshot`, execute `result.actions` for their side effects, and notify subscribers. The actor should no longer merge assign return values into context. `executeActions(...)` should therefore become a pure runtime effect runner. It should still pass `{ context, event, self }` to each action so custom actions behave the same, but it should not contain special logic for assign actions anymore. Because assign actions will have been filtered out by the machine, `executeActions(...)` can return `void` instead of returning a context object.

The fourth edit is also in `packages/machine/src/Actor.ts`, specifically the constructor path that consumes `getInitialTransition()`. That code already asks the machine for an object-shaped initial result and executes the returned actions. Once assign handling moves machine-side, the constructor should stop calling `executeActions(...)` to compute a new context. Instead, it should trust `initialTransition.snapshot.context` as already correct, assign that snapshot directly, and then run the remaining `initialTransition.actions` only for side effects. To make this work, `StateMachine.getInitialTransition()` must also be updated to interpret assign actions exactly the same way `transition(...)` does: compute the initial context, then return only runtime side-effect actions.

The fifth edit is test coverage. Update the existing runtime tests so they prove the new boundary rather than accidentally relying on actor-side assign semantics. Add at least one machine-level test that demonstrates `transition(...)` now returns a snapshot whose context already reflects assign actions before the actor runs anything. Add or update one actor test to prove that actor behavior is still correct even though it no longer reduces assign actions itself. A good candidate is `packages/machine/tests/Actor.test.ts`: after sending an increment event, the actor’s snapshot should still show the incremented context, but the mechanism will now be machine-side. Add or adjust one test for `getInitialTransition()` to show that initial entry assign actions are reflected in the returned snapshot context before any runtime side-effect actions execute.

There is an optional follow-up that should not be included in the first implementation unless it becomes necessary to make the typing sound: split `Action` into two distinct shapes, one for built-in pure state actions such as `assign(...)`, and one for runtime actions that require `self`. This is not required for the initial refactor, but if the code becomes awkward because machine-side assign handling still has to satisfy a runtime-style `ActionArgs` signature, record that in `Surprises & Discoveries` and decide whether to promote this follow-up into the active milestone.

## Concrete Steps

All commands below assume the working directory is the repository root:

    cd /Users/ricardosala/Projects/machine-turbo

Before editing, re-open these files to refresh context:

    sed -n '1,260p' packages/machine/src/types.ts
    sed -n '1,260p' packages/machine/src/StateMachine.ts
    sed -n '1,240p' packages/machine/src/Actor.ts
    sed -n '1,260p' packages/machine/src/actions.ts

After the first code pass, run the library tests and type checks first because they are the fastest signal:

    pnpm --filter @tinystack/machine test
    pnpm --filter @tinystack/machine typecheck

Expected outcome after the refactor:

    Test Files  5 passed
    Tests  40 passed

The exact timing numbers may differ, but the package should finish without TypeScript errors.

After the library package passes, run the full workspace verification:

    pnpm test
    pnpm typecheck
    pnpm build
    pnpm lint

Expected outcome after the refactor:

    Tasks:    2 successful, 2 total

for the workspace commands that fan out across the library and demo. The demo build will likely still print the known `baseline-browser-mapping` freshness warning from Next.js; this warning is acceptable and does not indicate a failure.

If a test fails because it was asserting an internal implementation detail of the actor rather than user-visible behavior, update the test to assert the public result instead and record that change in `Decision Log`.

## Validation and Acceptance

Acceptance is behavioral and architectural.

Behavioral acceptance means the existing observable behavior still works:

- Running `pnpm test` from the repository root passes.
- Running `pnpm typecheck` from the repository root passes.
- Running `pnpm build` from the repository root passes and still includes the demo routes, especially `/demos/coin-turnstile` and `/demos/form-wizard`.
- Running `pnpm lint` from the repository root passes.

Architectural acceptance means the code reads differently in a way a human can inspect:

- `packages/machine/src/StateMachine.ts` computes and returns the next `snapshot.context` during `transition(...)`.
- `packages/machine/src/StateMachine.ts` computes and returns the initial `snapshot.context` during `getInitialTransition()`.
- `packages/machine/src/Actor.ts` no longer merges assign return values into context during `send(...)`.
- `packages/machine/src/Actor.ts` no longer needs special-case `ASSIGN_ACTION_TYPE` logic for normal event processing.

A human reviewer should be able to open `packages/machine/src/Actor.ts` and see that `send(...)` is now “receive result, store snapshot, run runtime actions, notify”, rather than “receive result, compute new context, build snapshot, notify”.

## Idempotence and Recovery

This refactor is safe to perform incrementally because the repository already has strong test coverage around the actor and machine interaction. Make one coherent code pass, then run the library package checks before touching the demo. If a partial refactor leaves the build red, do not continue layering changes blindly. Re-open the affected files, restore type alignment, and rerun:

    pnpm --filter @tinystack/machine typecheck

Because the change is internal and behavior-preserving, there is no destructive migration. Recovery means reverting the affected files to the last known-green state and replaying the plan in smaller steps. Keep the actor constructor signature as `(machine, id?)`; earlier work in this repository showed that changing the argument order causes a large cascade of confusing failures.

## Artifacts and Notes

Current pre-refactor evidence showing the architectural split this plan is meant to remove:

    // packages/machine/src/StateMachine.ts
    transition(snapshot, event) {
      ...
      return {
        value: targetState,
        actions,
      };
    }

    // packages/machine/src/Actor.ts
    const result = this.machine.transition(this.snapshot, event);
    const newContext = this.executeActions(result.actions, event);
    this.snapshot = {
      status: this.snapshot.status,
      value: result.value,
      context: newContext,
    };

Desired post-refactor shape:

    // packages/machine/src/StateMachine.ts
    transition(snapshot, event) {
      ...
      return {
        snapshot: {
          status: snapshot.status,
          value: targetState,
          context: nextContext,
        },
        actions: runtimeActions,
      };
    }

    // packages/machine/src/Actor.ts
    const result = this.machine.transition(this.snapshot, event);
    this.snapshot = result.snapshot;
    this.executeActions(result.actions, event);
    this.notify();

## Interfaces and Dependencies

In `packages/machine/src/types.ts`, define or update the following interfaces:

    export interface TransitionResult<
      TContext extends MachineContext,
      TStateValue extends string,
      TEvent extends EventObject,
    > {
      snapshot: Snapshot<TContext, TStateValue>;
      actions: Array<Action<TContext, TEvent, TStateValue>>;
    }

Keep the existing `InitialTransitionResult` interface, but update its semantics so `snapshot.context` is already final and `actions` contains only runtime side-effect actions.

In `packages/machine/src/StateMachine.ts`, ensure these functions exist at the end of the refactor:

    getInitialTransition(): InitialTransitionResult<TContext, TStateValue, TEvent>
    transition(
      snapshot: Snapshot<TContext, TStateValue>,
      event: TEvent,
    ): TransitionResult<TContext, TStateValue, TEvent> | undefined
    can(snapshot: Snapshot<TContext, TStateValue>, event: TEvent): boolean

Add one private helper in `packages/machine/src/StateMachine.ts` for pure context reduction. The exact function name may vary, but it must clearly communicate that it computes the next context from a base context plus actions, not by running side effects.

In `packages/machine/src/Actor.ts`, keep these runtime-focused methods:

    send(event: TEvent): void
    getSnapshot(): Snapshot<TContext, TStateValue>
    subscribe(callback): () => void
    start(): void
    stop(): void
    matches(stateValue: TStateValue): boolean

Do not reintroduce `can(...)` on `ActorRef`; that was intentionally moved to the machine as a pure query in earlier work.

Revision note: Created on 2026-04-08 to capture the planned five-step refactor that moves `assign(...)` context handling from `Actor` into `StateMachine`, after `can()` and initial transition handling had already been moved machine-side. The purpose of this note is to preserve the architectural intent and exact migration sequence for future implementation.
