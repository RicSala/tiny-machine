'use client';

import { useState, useEffect, useRef } from 'react';
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
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Simulated search results
const mockDatabase = [
  'Apple',
  'Apricot',
  'Avocado',
  'Banana',
  'Blueberry',
  'Blackberry',
  'Cherry',
  'Coconut',
  'Cranberry',
  'Date',
  'Dragonfruit',
  'Elderberry',
  'Fig',
  'Grape',
  'Grapefruit',
  'Guava',
  'Honeydew',
  'Kiwi',
  'Kumquat',
  'Lemon',
  'Lime',
  'Lychee',
  'Mango',
  'Melon',
  'Mulberry',
  'Nectarine',
  'Orange',
  'Papaya',
  'Peach',
  'Pear',
  'Pineapple',
  'Plum',
  'Pomegranate',
  'Raspberry',
  'Strawberry',
  'Tangerine',
  'Watermelon',
];

// Simulate API with variable latency (key to demonstrating race conditions!)
const searchAPI = async (
  query: string,
  requestId: number
): Promise<{ results: string[]; requestId: number; latency: number }> => {
  // Random latency between 200ms and 1500ms - this causes race conditions!
  const latency = Math.floor(Math.random() * 1300) + 200;
  await new Promise((resolve) => setTimeout(resolve, latency));

  const results =
    query.length > 0
      ? mockDatabase.filter((item) =>
          item.toLowerCase().includes(query.toLowerCase())
        )
      : [];

  return { results, requestId, latency };
};

// ============ STATE MACHINE APPROACH ============

interface SearchContext {
  query: string;
  results: string[];
  currentRequestId: number;
  error: string | null;
  lastResponseInfo: { requestId: number; latency: number } | null;
}

type SearchEvent =
  | { type: 'TYPE'; query: string }
  | { type: 'SEARCH' }
  | { type: 'SUCCESS'; results: string[]; requestId: number; latency: number }
  | { type: 'ERROR'; error: string }
  | { type: 'CLEAR' };

const { createMachine, assign } = setup({
  types: {} as {
    context: SearchContext;
    events: SearchEvent;
  },
});

const searchMachine = createMachine({
  id: 'search',
  initial: 'idle',
  context: {
    query: '',
    results: [],
    currentRequestId: 0,
    error: null,
    lastResponseInfo: null,
  },
  states: {
    idle: {
      on: {
        TYPE: {
          target: 'debouncing',
          actions: [
            assign(({ event }) => {
              if (event.type !== 'TYPE') return {};
              return { query: event.query };
            }),
          ],
        },
      },
    },
    debouncing: {
      entry: [
        {
          type: 'startDebounce',
          exec: ({ self }) => {
            const timeoutId = setTimeout(() => {
              self.send({ type: 'SEARCH' });
            }, 300);
            // Store timeout for cleanup (in real app, would use context)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (self as any)._debounceTimeout = timeoutId;
          },
        },
      ],
      exit: [
        {
          type: 'clearDebounce',
          exec: ({ self }) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            clearTimeout((self as any)._debounceTimeout);
          },
        },
      ],
      on: {
        TYPE: {
          target: 'debouncing',
          reenter: true,
          actions: [
            assign(({ event }) => {
              if (event.type !== 'TYPE') return {};
              return { query: event.query };
            }),
          ],
        },
        SEARCH: {
          target: 'loading',
          actions: [
            assign(({ context }) => ({
              currentRequestId: context.currentRequestId + 1,
            })),
          ],
        },
        CLEAR: {
          target: 'idle',
          actions: [assign(() => ({ query: '', results: [], error: null }))],
        },
      },
    },
    loading: {
      entry: [
        {
          type: 'fetchResults',
          exec: async ({ self, context }) => {
            const requestId = context.currentRequestId;
            try {
              const { results, latency } = await searchAPI(
                context.query,
                requestId
              );
              self.send({ type: 'SUCCESS', results, requestId, latency });
            } catch (err) {
              self.send({ type: 'ERROR', error: (err as Error).message });
            }
          },
        },
      ],
      on: {
        TYPE: {
          target: 'debouncing',
          actions: [
            assign(({ event }) => {
              if (event.type !== 'TYPE') return {};
              return { query: event.query };
            }),
          ],
        },
        SUCCESS: {
          target: 'success',
          // GUARD: Only accept response if it matches current request!
          guard: ({ context, event }) => {
            if (event.type !== 'SUCCESS') return false;
            return event.requestId === context.currentRequestId;
          },
          actions: [
            assign(({ event }) => {
              if (event.type !== 'SUCCESS') return {};
              return {
                results: event.results,
                lastResponseInfo: {
                  requestId: event.requestId,
                  latency: event.latency,
                },
              };
            }),
          ],
        },
        ERROR: {
          target: 'error',
          actions: [
            assign(({ event }) => {
              if (event.type !== 'ERROR') return {};
              return { error: event.error };
            }),
          ],
        },
        CLEAR: {
          target: 'idle',
          actions: [assign(() => ({ query: '', results: [], error: null }))],
        },
      },
    },
    success: {
      on: {
        TYPE: {
          target: 'debouncing',
          actions: [
            assign(({ event }) => {
              if (event.type !== 'TYPE') return {};
              return { query: event.query };
            }),
          ],
        },
        CLEAR: {
          target: 'idle',
          actions: [
            assign(() => ({
              query: '',
              results: [],
              error: null,
              lastResponseInfo: null,
            })),
          ],
        },
      },
    },
    error: {
      on: {
        TYPE: {
          target: 'debouncing',
          actions: [
            assign(({ event }) => {
              if (event.type !== 'TYPE') return {};
              return { query: event.query, error: null };
            }),
          ],
        },
        CLEAR: {
          target: 'idle',
          actions: [assign(() => ({ query: '', results: [], error: null }))],
        },
      },
    },
  },
});

// ============ BUGGY BOOLEAN APPROACH ============

interface BuggySearchLog {
  type: 'request' | 'response' | 'displayed';
  requestId: number;
  query: string;
  latency?: number;
  timestamp: number;
}

function useBuggySearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<BuggySearchLog[]>([]);
  const requestCountRef = useRef(0);

  const search = async (searchQuery: string) => {
    if (!searchQuery) {
      setResults([]);
      return;
    }

    requestCountRef.current += 1;
    const requestId = requestCountRef.current;

    setIsLoading(true);
    setLogs((prev) => [
      ...prev,
      {
        type: 'request',
        requestId,
        query: searchQuery,
        timestamp: Date.now(),
      },
    ]);

    try {
      const { results: searchResults, latency } = await searchAPI(
        searchQuery,
        requestId
      );

      setLogs((prev) => [
        ...prev,
        {
          type: 'response',
          requestId,
          query: searchQuery,
          latency,
          timestamp: Date.now(),
        },
      ]);

      // BUG: No check if this is still the current query!
      // If user typed "ap" then "app", and "ap" response comes back AFTER "app",
      // we'll show wrong results!
      setResults(searchResults);
      setLogs((prev) => [
        ...prev,
        {
          type: 'displayed',
          requestId,
          query: searchQuery,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleType = (value: string) => {
    setQuery(value);
    search(value);
  };

  const clear = () => {
    setQuery('');
    setResults([]);
    setLogs([]);
    requestCountRef.current = 0;
  };

  return { query, results, isLoading, logs, handleType, clear };
}

// ============ COMPONENT ============

export default function AsyncSearchDemo() {
  const [actor] = useState(() => new Actor(searchMachine));
  const [snapshot, setSnapshot] = useState(actor.getSnapshot());
  const buggySearch = useBuggySearch();

  useEffect(() => {
    const unsubscribe = actor.subscribe(setSnapshot);
    return unsubscribe;
  }, [actor]);

  const currentState = snapshot.value;
  const ctx = snapshot.context;

  return (
    <div className='min-h-screen bg-zinc-50 dark:bg-zinc-950 py-12 px-6'>
      <div className='mx-auto max-w-3xl'>
        <Link
          href='/'
          className='text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
        >
          &larr; Back to demos
        </Link>

        <h1 className='mt-6 mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50'>
          Async Search with Race Conditions
        </h1>
        <p className='mb-6 text-zinc-600 dark:text-zinc-400'>
          Type quickly to trigger race conditions. The API has random latency
          (200-1500ms).
        </p>

        <Tabs defaultValue='machine' className='space-y-6'>
          <TabsList className='grid w-full grid-cols-2'>
            <TabsTrigger value='machine'>State Machine (Safe)</TabsTrigger>
            <TabsTrigger value='buggy'>Boolean Flags (Buggy)</TabsTrigger>
          </TabsList>

          {/* STATE MACHINE TAB */}
          <TabsContent value='machine'>
            <Card>
              <CardHeader>
                <div className='flex items-center justify-between'>
                  <CardTitle>State Machine Approach</CardTitle>
                  <div className='flex gap-2'>
                    <Badge variant='outline'>{currentState}</Badge>
                    <Badge variant='secondary'>
                      Request #{ctx.currentRequestId}
                    </Badge>
                  </div>
                </div>
                <CardDescription>
                  Guards ensure only the current request&apos;s response is
                  displayed.
                </CardDescription>
              </CardHeader>

              <CardContent className='space-y-4'>
                <div className='flex gap-2'>
                  <Input
                    placeholder='Search fruits... (try typing quickly!)'
                    value={ctx.query}
                    onChange={(e) =>
                      actor.send({ type: 'TYPE', query: e.target.value })
                    }
                  />
                  <Button
                    variant='outline'
                    onClick={() => actor.send({ type: 'CLEAR' })}
                  >
                    Clear
                  </Button>
                </div>

                <div className='min-h-[200px] rounded-lg border bg-zinc-50 dark:bg-zinc-900 p-4'>
                  {currentState === 'idle' && (
                    <p className='text-zinc-500 text-sm'>
                      Start typing to search...
                    </p>
                  )}
                  {currentState === 'debouncing' && (
                    <p className='text-zinc-500 text-sm'>
                      Waiting for you to stop typing...
                    </p>
                  )}
                  {currentState === 'loading' && (
                    <div className='flex items-center gap-2'>
                      <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-zinc-900 dark:border-zinc-100' />
                      <span className='text-sm text-zinc-500'>
                        Searching...
                      </span>
                    </div>
                  )}
                  {(currentState === 'success' || currentState === 'error') && (
                    <div className='space-y-2'>
                      {ctx.lastResponseInfo && (
                        <p className='text-xs text-zinc-400'>
                          Response from request #
                          {ctx.lastResponseInfo.requestId} (
                          {ctx.lastResponseInfo.latency}ms)
                        </p>
                      )}
                      {ctx.results.length > 0 ? (
                        <ul className='space-y-1'>
                          {ctx.results.map((result) => (
                            <li
                              key={result}
                              className='px-3 py-2 rounded bg-white dark:bg-zinc-800 text-sm'
                            >
                              {result}
                            </li>
                          ))}
                        </ul>
                      ) : ctx.query ? (
                        <p className='text-zinc-500 text-sm'>
                          No results found
                        </p>
                      ) : null}
                    </div>
                  )}
                </div>

                <div className='p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-sm'>
                  <p className='font-medium text-green-800 dark:text-green-300'>
                    Why this works:
                  </p>
                  <ul className='mt-1 text-green-700 dark:text-green-400 space-y-1'>
                    <li>• Each request gets a unique ID stored in context</li>
                    <li>
                      • Guard checks:{' '}
                      <code className='bg-green-100 dark:bg-green-800 px-1 rounded'>
                        event.requestId === ctx.currentRequestId
                      </code>
                    </li>
                    <li>• Stale responses are automatically rejected</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* BUGGY BOOLEAN TAB */}
          <TabsContent value='buggy'>
            <Card>
              <CardHeader>
                <div className='flex items-center justify-between'>
                  <CardTitle>Boolean Flags Approach</CardTitle>
                  <Badge
                    variant={buggySearch.isLoading ? 'default' : 'outline'}
                  >
                    {buggySearch.isLoading ? 'Loading...' : 'Idle'}
                  </Badge>
                </div>
                <CardDescription>
                  Type &quot;ap&quot; then quickly &quot;app&quot; - watch the
                  race condition bug!
                </CardDescription>
              </CardHeader>

              <CardContent className='space-y-4'>
                <div className='flex gap-2'>
                  <Input
                    placeholder='Search fruits... (try typing quickly!)'
                    value={buggySearch.query}
                    onChange={(e) => buggySearch.handleType(e.target.value)}
                  />
                  <Button variant='outline' onClick={buggySearch.clear}>
                    Clear
                  </Button>
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  {/* Results */}
                  <div className='min-h-[200px] rounded-lg border bg-zinc-50 dark:bg-zinc-900 p-4'>
                    <p className='text-xs font-medium text-zinc-400 mb-2'>
                      Results:
                    </p>
                    {buggySearch.results.length > 0 ? (
                      <ul className='space-y-1'>
                        {buggySearch.results.map((result) => (
                          <li
                            key={result}
                            className='px-3 py-2 rounded bg-white dark:bg-zinc-800 text-sm'
                          >
                            {result}
                          </li>
                        ))}
                      </ul>
                    ) : buggySearch.query ? (
                      <p className='text-zinc-500 text-sm'>No results</p>
                    ) : (
                      <p className='text-zinc-500 text-sm'>Start typing...</p>
                    )}
                  </div>

                  {/* Request Log */}
                  <div className='min-h-[200px] rounded-lg border bg-zinc-50 dark:bg-zinc-900 p-4 overflow-auto'>
                    <p className='text-xs font-medium text-zinc-400 mb-2'>
                      Request Log:
                    </p>
                    {buggySearch.logs.length === 0 ? (
                      <p className='text-zinc-500 text-sm'>No requests yet</p>
                    ) : (
                      <ul className='space-y-1 text-xs font-mono'>
                        {buggySearch.logs.map((log, i) => (
                          <li
                            key={i}
                            className={`px-2 py-1 rounded ${
                              log.type === 'request'
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                : log.type === 'response'
                                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                            }`}
                          >
                            {log.type === 'request' &&
                              `→ #${log.requestId}: "${log.query}"`}
                            {log.type === 'response' &&
                              `← #${log.requestId}: ${log.latency}ms`}
                            {log.type === 'displayed' &&
                              `✗ #${log.requestId} DISPLAYED (possibly stale!)`}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className='p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm'>
                  <p className='font-medium text-red-800 dark:text-red-300'>
                    The Race Condition Bug:
                  </p>
                  <ul className='mt-1 text-red-700 dark:text-red-400 space-y-1'>
                    <li>
                      1. User types &quot;ap&quot; → Request #1 sent (slow:
                      1200ms)
                    </li>
                    <li>
                      2. User types &quot;app&quot; → Request #2 sent (fast:
                      300ms)
                    </li>
                    <li>
                      3. Request #2 returns first → Shows &quot;Apple&quot;
                    </li>
                    <li>
                      4. Request #1 returns later →{' '}
                      <strong>Overwrites with stale results!</strong>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className='mt-8 p-4 rounded-lg bg-zinc-100 dark:bg-zinc-900'>
          <h3 className='font-medium mb-2 text-sm'>
            The &quot;Aha!&quot; Moment:
          </h3>
          <p className='text-sm text-zinc-600 dark:text-zinc-400'>
            Without state machines, you&apos;d need to manually track request
            IDs, compare them in every response handler, and remember to do this
            consistently. With a state machine, the guard handles it
            automatically - stale responses simply don&apos;t trigger
            transitions.
          </p>
        </div>
      </div>
    </div>
  );
}
