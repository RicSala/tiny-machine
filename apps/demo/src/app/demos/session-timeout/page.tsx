'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { setup, Actor } from '@tinystack/machine';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ============ CONFIGURATION ============
const IDLE_TIMEOUT_MS = 5000; // 5 seconds until warning (short for demo)
const WARNING_DURATION_MS = 10000; // 10 seconds warning before logout

// ============ STATE MACHINE APPROACH ============

interface SessionTimers {
  idleTimerId: ReturnType<typeof setTimeout> | null;
  warningIntervalId: ReturnType<typeof setInterval> | null;
}

interface SessionContext {
  lastActivityAt: number;
  warningStartedAt: number | null;
  secondsRemaining: number;
}

type SessionEvent =
  | { type: 'ACTIVITY' }
  | { type: 'IDLE_TIMEOUT' }
  | { type: 'TICK' }
  | { type: 'TICK_DECREMENT' }
  | { type: 'STAY_LOGGED_IN' }
  | { type: 'LOGOUT' }
  | { type: 'LOGIN' };

const { createMachine, assign } = setup({
  types: {} as {
    context: SessionContext;
    events: SessionEvent;
  },
});

const sessionTimers = new WeakMap<object, SessionTimers>();

function getSessionTimers(self: object): SessionTimers {
  const existingTimers = sessionTimers.get(self);
  if (existingTimers) {
    return existingTimers;
  }

  const timers: SessionTimers = {
    idleTimerId: null,
    warningIntervalId: null,
  };
  sessionTimers.set(self, timers);
  return timers;
}

const sessionMachine = createMachine({
  id: 'session',
  initial: 'active',
  context: {
    lastActivityAt: Date.now(),
    warningStartedAt: null,
    secondsRemaining: WARNING_DURATION_MS / 1000,
  },
  states: {
    active: {
      entry: [
        {
          type: 'startIdleTimer',
          exec: ({ self }) => {
            const checkIdle = () => {
              const timerId = setTimeout(() => {
                self.send({ type: 'IDLE_TIMEOUT' });
              }, IDLE_TIMEOUT_MS);
              getSessionTimers(self).idleTimerId = timerId;
            };
            checkIdle();
          },
        },
      ],
      exit: [
        {
          type: 'clearIdleTimer',
          exec: ({ self }) => {
            const timers = getSessionTimers(self);
            if (timers.idleTimerId) {
              clearTimeout(timers.idleTimerId);
              timers.idleTimerId = null;
            }
          },
        },
      ],
      on: {
        ACTIVITY: {
          target: 'active',
          reenter: true,
          actions: [
            assign(() => ({
              lastActivityAt: Date.now(),
            })),
          ],
        },
        IDLE_TIMEOUT: {
          target: 'warning',
        },
        LOGOUT: {
          target: 'loggedOut',
        },
      },
    },
    warning: {
      entry: [
        assign(() => ({
          warningStartedAt: Date.now(),
          secondsRemaining: WARNING_DURATION_MS / 1000,
        })),
        {
          type: 'startWarningCountdown',
          exec: ({ self }) => {
            const intervalId = setInterval(() => {
              // First decrement, then check if expired
              self.send({ type: 'TICK_DECREMENT' });
              self.send({ type: 'TICK' });
            }, 1000);
            getSessionTimers(self).warningIntervalId = intervalId;
          },
        },
      ],
      exit: [
        {
          type: 'clearWarningCountdown',
          exec: ({ self }) => {
            const timers = getSessionTimers(self);
            if (timers.warningIntervalId) {
              clearInterval(timers.warningIntervalId);
              timers.warningIntervalId = null;
            }
          },
        },
      ],
      on: {
        TICK: {
          target: 'loggedOut',
          guard: (ctx) => ctx.secondsRemaining <= 1,
        },
        TICK_DECREMENT: {
          actions: [
            assign(({ context }) => ({
              secondsRemaining: context.secondsRemaining - 1,
            })),
          ],
        },
        ACTIVITY: {
          target: 'active',
          actions: [
            assign(() => ({
              lastActivityAt: Date.now(),
              warningStartedAt: null,
            })),
          ],
        },
        STAY_LOGGED_IN: {
          target: 'active',
          actions: [
            assign(() => ({
              lastActivityAt: Date.now(),
              warningStartedAt: null,
            })),
          ],
        },
        LOGOUT: {
          target: 'loggedOut',
        },
      },
    },
    loggedOut: {
      entry: [
        assign(() => ({
          warningStartedAt: null,
          secondsRemaining: WARNING_DURATION_MS / 1000,
        })),
      ],
      on: {
        LOGIN: {
          target: 'active',
          actions: [
            assign(() => ({
              lastActivityAt: Date.now(),
            })),
          ],
        },
      },
    },
  },
});

// ============ BUGGY BOOLEAN APPROACH ============

function useBuggySessionTimeout() {
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [isWarningVisible, setIsWarningVisible] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(WARNING_DURATION_MS / 1000);
  const [logs, setLogs] = useState<string[]>([]);

  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const warningIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const addLog = useCallback((message: string) => {
    setLogs((prev) => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${message}`]);
  }, []);

  const resetIdleTimer = useCallback(() => {
    // BUG: Easy to forget to clear the old timer!
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    // BUG: What if isWarningVisible is true? Should we hide it?
    // This logic gets messy quickly...
    if (isLoggedIn && !isWarningVisible) {
      idleTimerRef.current = setTimeout(() => {
        addLog('Idle timeout - showing warning');
        setIsWarningVisible(true);
        setSecondsRemaining(WARNING_DURATION_MS / 1000);

        // Start countdown
        // BUG: What if there's already an interval running?
        warningIntervalRef.current = setInterval(() => {
          setSecondsRemaining((prev) => {
            if (prev <= 1) {
              // BUG: Clearing interval inside setInterval callback is tricky
              clearInterval(warningIntervalRef.current!);
              setIsLoggedIn(false);
              setIsWarningVisible(false);
              addLog('Session expired - logged out');
              return WARNING_DURATION_MS / 1000;
            }
            return prev - 1;
          });
        }, 1000);
      }, IDLE_TIMEOUT_MS);
    }
  }, [isLoggedIn, isWarningVisible, addLog]);

  const handleActivity = useCallback(() => {
    if (isLoggedIn && !isWarningVisible) {
      addLog('Activity detected - resetting timer');
      resetIdleTimer();
    }
    // BUG: What if they're in the warning state? Activity is ignored!
    // Should activity during warning keep them logged in?
  }, [isLoggedIn, isWarningVisible, resetIdleTimer, addLog]);

  const stayLoggedIn = useCallback(() => {
    addLog('User clicked "Stay Logged In"');
    setIsWarningVisible(false);
    if (warningIntervalRef.current) {
      clearInterval(warningIntervalRef.current);
    }
    setSecondsRemaining(WARNING_DURATION_MS / 1000);
    resetIdleTimer();
  }, [resetIdleTimer, addLog]);

  const logout = useCallback(() => {
    addLog('User clicked "Logout"');
    setIsLoggedIn(false);
    setIsWarningVisible(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (warningIntervalRef.current) clearInterval(warningIntervalRef.current);
  }, [addLog]);

  const login = useCallback(() => {
    addLog('User logged in');
    setIsLoggedIn(true);
    setIsWarningVisible(false);
    setSecondsRemaining(WARNING_DURATION_MS / 1000);
    resetIdleTimer();
  }, [resetIdleTimer, addLog]);

  // Setup activity listeners
  useEffect(() => {
    if (isLoggedIn) {
      resetIdleTimer();
    }

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (warningIntervalRef.current) clearInterval(warningIntervalRef.current);
    };
    // Intentionally omits resetIdleTimer to preserve the buggy example.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]); // BUG: resetIdleTimer in deps causes infinite loop!

  return {
    isLoggedIn,
    isWarningVisible,
    secondsRemaining,
    logs,
    handleActivity,
    stayLoggedIn,
    logout,
    login,
  };
}

// ============ ACTIVITY TRACKER COMPONENT ============

function ActivityZone({
  onActivity,
  children,
  label,
}: {
  onActivity: () => void;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <div
      onMouseMove={onActivity}
      onKeyDown={onActivity}
      onClick={onActivity}
      className="relative"
      tabIndex={0}
    >
      <div className="absolute top-2 right-2 text-xs text-zinc-400">
        {label}
      </div>
      {children}
    </div>
  );
}

// ============ MAIN COMPONENT ============

export default function SessionTimeoutDemo() {
  const [actor] = useState(() => new Actor(sessionMachine));
  const [snapshot, setSnapshot] = useState(actor.getSnapshot());
  const buggy = useBuggySessionTimeout();

  useEffect(() => {
    const unsubscribe = actor.subscribe(setSnapshot);
    return unsubscribe;
  }, [actor]);

  const currentState = snapshot.value;
  const ctx = snapshot.context;

  const handleStateMachineActivity = useCallback(() => {
    // Activity resets timer in both 'active' and 'warning' states
    if (currentState === 'active' || currentState === 'warning') {
      actor.send({ type: 'ACTIVITY' });
    }
  }, [actor, currentState]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-12 px-6">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          &larr; Back to demos
        </Link>

        <h1 className="mt-6 mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Session Timeout / Idle Detection
        </h1>
        <p className="mb-2 text-zinc-600 dark:text-zinc-400">
          Stop moving your mouse for 5 seconds to trigger the idle warning.
        </p>
        <p className="mb-6 text-sm text-zinc-500">
          Idle timeout: {IDLE_TIMEOUT_MS / 1000}s • Warning duration: {WARNING_DURATION_MS / 1000}s
        </p>

        <Tabs defaultValue="machine" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="machine">State Machine</TabsTrigger>
            <TabsTrigger value="buggy">Boolean Flags (Buggy)</TabsTrigger>
          </TabsList>

          {/* STATE MACHINE TAB */}
          <TabsContent value="machine">
            <ActivityZone onActivity={handleStateMachineActivity} label="Move mouse here ↓">
              <Card className="min-h-[400px]">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>State Machine Approach</CardTitle>
                    <Badge
                      variant={
                        currentState === 'active' ? 'default' :
                        currentState === 'warning' ? 'destructive' :
                        'secondary'
                      }
                    >
                      {currentState}
                    </Badge>
                  </div>
                  <CardDescription>
                    Clean state transitions with automatic timer management.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Active State */}
                  {currentState === 'active' && (
                    <div className="text-center py-8">
                      <div className="text-6xl mb-4">✓</div>
                      <p className="text-lg font-medium text-green-600 dark:text-green-400">
                        Session Active
                      </p>
                      <p className="text-sm text-zinc-500 mt-2">
                        Move your mouse to stay active
                      </p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => actor.send({ type: 'LOGOUT' })}
                      >
                        Logout
                      </Button>
                    </div>
                  )}

                  {/* Warning State */}
                  {currentState === 'warning' && (
                    <div className="text-center py-4">
                      <div className="text-6xl mb-4">⚠️</div>
                      <p className="text-lg font-medium text-amber-600 dark:text-amber-400">
                        Session Expiring Soon
                      </p>
                      <p className="text-sm text-zinc-500 mt-2">
                        You will be logged out in:
                      </p>
                      <p className="text-4xl font-bold text-red-600 dark:text-red-400 my-4">
                        {ctx.secondsRemaining}s
                      </p>
                      <Progress
                        value={(ctx.secondsRemaining / (WARNING_DURATION_MS / 1000)) * 100}
                        className="h-2 mb-4"
                      />
                      <p className="text-xs text-zinc-400 mb-4">
                        Move your mouse or click anywhere to stay logged in
                      </p>
                      <div className="flex gap-2 justify-center">
                        <Button onClick={() => actor.send({ type: 'STAY_LOGGED_IN' })}>
                          Stay Logged In
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => actor.send({ type: 'LOGOUT' })}
                        >
                          Logout Now
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Logged Out State */}
                  {currentState === 'loggedOut' && (
                    <div className="text-center py-8">
                      <div className="text-6xl mb-4">🔒</div>
                      <p className="text-lg font-medium text-zinc-600 dark:text-zinc-400">
                        Session Expired
                      </p>
                      <p className="text-sm text-zinc-500 mt-2">
                        Your session has timed out due to inactivity.
                      </p>
                      <Button
                        className="mt-4"
                        onClick={() => actor.send({ type: 'LOGIN' })}
                      >
                        Login Again
                      </Button>
                    </div>
                  )}

                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-sm">
                    <p className="font-medium text-green-800 dark:text-green-300">
                      State Machine Benefits:
                    </p>
                    <ul className="mt-1 text-green-700 dark:text-green-400 space-y-1">
                      <li>• Entry/exit actions auto-manage timers</li>
                      <li>• Can&apos;t be &quot;active&quot; AND &quot;warning&quot; simultaneously</li>
                      <li>• ACTIVITY event works in both states (explicitly defined)</li>
                      <li>• Guard prevents logout until countdown reaches 0</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </ActivityZone>
          </TabsContent>

          {/* BUGGY BOOLEAN TAB */}
          <TabsContent value="buggy">
            <ActivityZone onActivity={buggy.handleActivity} label="Move mouse here ↓">
              <Card className="min-h-[400px]">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Boolean Flags Approach</CardTitle>
                    <div className="flex gap-1">
                      <Badge variant={buggy.isLoggedIn ? 'default' : 'secondary'}>
                        logged: {String(buggy.isLoggedIn)}
                      </Badge>
                      <Badge variant={buggy.isWarningVisible ? 'destructive' : 'outline'}>
                        warning: {String(buggy.isWarningVisible)}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription>
                    Multiple booleans, timer refs, and edge case bugs.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Status */}
                    <div className="space-y-4">
                      {buggy.isLoggedIn && !buggy.isWarningVisible && (
                        <div className="text-center py-4">
                          <div className="text-4xl mb-2">✓</div>
                          <p className="font-medium text-green-600">Active</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={buggy.logout}
                          >
                            Logout
                          </Button>
                        </div>
                      )}

                      {buggy.isLoggedIn && buggy.isWarningVisible && (
                        <div className="text-center py-4">
                          <div className="text-4xl mb-2">⚠️</div>
                          <p className="font-medium text-amber-600">Warning!</p>
                          <p className="text-2xl font-bold text-red-600 my-2">
                            {buggy.secondsRemaining}s
                          </p>
                          <div className="flex gap-1 justify-center">
                            <Button size="sm" onClick={buggy.stayLoggedIn}>
                              Stay
                            </Button>
                            <Button size="sm" variant="outline" onClick={buggy.logout}>
                              Logout
                            </Button>
                          </div>
                        </div>
                      )}

                      {!buggy.isLoggedIn && (
                        <div className="text-center py-4">
                          <div className="text-4xl mb-2">🔒</div>
                          <p className="font-medium text-zinc-600">Logged Out</p>
                          <Button size="sm" className="mt-2" onClick={buggy.login}>
                            Login
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Debug Log */}
                    <div className="rounded-lg border bg-zinc-900 p-3 text-xs font-mono h-[200px] overflow-auto">
                      <p className="text-zinc-400 mb-2">Debug Log:</p>
                      {buggy.logs.length === 0 ? (
                        <p className="text-zinc-600">No events yet</p>
                      ) : (
                        buggy.logs.map((log, i) => (
                          <p key={i} className="text-zinc-300">{log}</p>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm">
                    <p className="font-medium text-red-800 dark:text-red-300">
                      Common Bugs in Boolean Approach:
                    </p>
                    <ul className="mt-1 text-red-700 dark:text-red-400 space-y-1">
                      <li>• Forgetting to clear timers before setting new ones</li>
                      <li>• Activity during warning is ignored (or inconsistently handled)</li>
                      <li>• <code>isLoggedIn && isWarningVisible</code> - valid combo?</li>
                      <li>• Clearing interval inside setInterval callback issues</li>
                      <li>• Memory leaks from orphaned timers</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </ActivityZone>
          </TabsContent>
        </Tabs>

        <div className="mt-8 p-4 rounded-lg bg-zinc-100 dark:bg-zinc-900">
          <h3 className="font-medium mb-2 text-sm">Real-World Application:</h3>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Banking apps, admin dashboards, and security-sensitive applications all need idle detection.
            The state machine approach makes the flow explicit: active → idle warning → logged out.
            Timer cleanup is automatic via entry/exit actions. No orphaned timers, no race conditions.
          </p>
        </div>
      </div>
    </div>
  );
}
