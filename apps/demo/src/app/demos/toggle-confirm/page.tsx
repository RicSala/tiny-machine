"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { setup, Actor } from "@tinystack/machine";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Define types for the state machine
interface ToggleContext {
  enabledAt: Date | null;
}

type ToggleEvent =
  | { type: "TOGGLE" }
  | { type: "CONFIRM" }
  | { type: "CANCEL" };

// Create typed setup
const { createMachine, assign } = setup({
  types: {} as {
    context: ToggleContext;
    events: ToggleEvent;
  },
});

// Create the toggle machine with confirmation
const toggleMachine = createMachine({
  id: "toggleWithConfirm",
  initial: "off",
  context: {
    enabledAt: null,
  },
  states: {
    off: {
      on: {
        TOGGLE: { target: "confirmingOn" },
      },
    },
    confirmingOn: {
      on: {
        CONFIRM: {
          target: "on",
          actions: [assign(() => ({ enabledAt: new Date() }))],
        },
        CANCEL: { target: "off" },
      },
    },
    on: {
      on: {
        TOGGLE: { target: "confirmingOff" },
      },
    },
    confirmingOff: {
      on: {
        CONFIRM: {
          target: "off",
          actions: [assign(() => ({ enabledAt: null }))],
        },
        CANCEL: { target: "on" },
      },
    },
  },
});

// Simple boolean-based toggle with confirmation for comparison
function useBooleanToggle() {
  const [isOn, setIsOn] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingAction, setPendingAction] = useState<"on" | "off" | null>(null);

  const toggle = () => {
    setPendingAction(isOn ? "off" : "on");
    setShowConfirm(true);
  };

  const confirm = () => {
    if (pendingAction === "on") {
      setIsOn(true);
    } else {
      setIsOn(false);
    }
    setShowConfirm(false);
    setPendingAction(null);
  };

  const cancel = () => {
    setShowConfirm(false);
    setPendingAction(null);
  };

  return { isOn, showConfirm, toggle, confirm, cancel, pendingAction };
}

export default function ToggleConfirmDemo() {
  // State machine approach
  const [actor] = useState(() => new Actor(toggleMachine));
  const [snapshot, setSnapshot] = useState(actor.getSnapshot());

  // Boolean approach
  const booleanToggle = useBooleanToggle();

  useEffect(() => {
    const unsubscribe = actor.subscribe(setSnapshot);
    return unsubscribe;
  }, [actor]);

  const currentState = snapshot.value;
  const isDialogOpen = currentState === "confirmingOn" || currentState === "confirmingOff";
  const isEnabled = currentState === "on" || currentState === "confirmingOff";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-12 px-6">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
          &larr; Back to demos
        </Link>

        <h1 className="mt-6 mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Toggle with Confirmation
        </h1>
        <p className="mb-6 text-zinc-600 dark:text-zinc-400">
          Even a &quot;simple&quot; toggle can have hidden complexity when you add confirmation dialogs.
        </p>

        <div className="grid gap-6 md:grid-cols-2">
          {/* State Machine Approach */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">State Machine</CardTitle>
                <Badge variant="outline">{currentState}</Badge>
              </div>
              <CardDescription>4 explicit states, clear transitions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-100 dark:bg-zinc-900">
                <span className="font-medium">Feature Toggle</span>
                <Button
                  variant={isEnabled ? "default" : "outline"}
                  onClick={() => actor.send({ type: "TOGGLE" })}
                >
                  {isEnabled ? "Enabled" : "Disabled"}
                </Button>
              </div>

              {snapshot.context.enabledAt && (
                <p className="text-xs text-zinc-500">
                  Enabled at: {snapshot.context.enabledAt.toLocaleTimeString()}
                </p>
              )}

              <div className="text-xs font-mono p-3 rounded bg-zinc-800 text-zinc-300">
                <div>states: off, confirmingOn, on, confirmingOff</div>
                <div className="text-green-400">current: {currentState}</div>
              </div>
            </CardContent>
          </Card>

          {/* Boolean Approach */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Boolean Flags</CardTitle>
                <div className="flex gap-1">
                  <Badge variant="outline" className="text-xs">
                    isOn: {String(booleanToggle.isOn)}
                  </Badge>
                </div>
              </div>
              <CardDescription>Multiple booleans to track</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-100 dark:bg-zinc-900">
                <span className="font-medium">Feature Toggle</span>
                <Button
                  variant={booleanToggle.isOn ? "default" : "outline"}
                  onClick={booleanToggle.toggle}
                >
                  {booleanToggle.isOn ? "Enabled" : "Disabled"}
                </Button>
              </div>

              <div className="text-xs font-mono p-3 rounded bg-zinc-800 text-zinc-300">
                <div>isOn: {String(booleanToggle.isOn)}</div>
                <div>showConfirm: {String(booleanToggle.showConfirm)}</div>
                <div>pendingAction: {String(booleanToggle.pendingAction)}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* State Machine Dialog */}
        <AlertDialog open={isDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {currentState === "confirmingOn" ? "Enable Feature?" : "Disable Feature?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {currentState === "confirmingOn"
                  ? "This will enable the feature for your account."
                  : "This will disable the feature. You can re-enable it later."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => actor.send({ type: "CANCEL" })}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction onClick={() => actor.send({ type: "CONFIRM" })}>
                {currentState === "confirmingOn" ? "Enable" : "Disable"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Boolean Dialog */}
        <AlertDialog open={booleanToggle.showConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {booleanToggle.pendingAction === "on" ? "Enable Feature?" : "Disable Feature?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {booleanToggle.pendingAction === "on"
                  ? "This will enable the feature for your account."
                  : "This will disable the feature. You can re-enable it later."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={booleanToggle.cancel}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={booleanToggle.confirm}>
                {booleanToggle.pendingAction === "on" ? "Enable" : "Disable"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
            <h3 className="font-medium mb-2 text-sm text-green-800 dark:text-green-300">
              State Machine Benefits:
            </h3>
            <ul className="text-sm text-green-700 dark:text-green-400 space-y-1">
              <li>• All 4 states are explicit and named</li>
              <li>• Impossible to be &quot;confirming&quot; without a pending action</li>
              <li>• State diagram can be visualized</li>
              <li>• Easy to add new states (e.g., &quot;saving&quot;)</li>
            </ul>
          </div>
          <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20">
            <h3 className="font-medium mb-2 text-sm text-amber-800 dark:text-amber-300">
              Boolean Complexity:
            </h3>
            <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-1">
              <li>• 3 variables = 8 possible combinations</li>
              <li>• Only 4 are valid (same as machine states)</li>
              <li>• Easy to forget resetting pendingAction</li>
              <li>• Harder to reason about as complexity grows</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
