'use client';

import { useState, useEffect } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Define types
interface FetchContext {
  data: { id: number; title: string; body: string } | null;
  error: string | null;
  retryCount: number;
}

type FetchEvent =
  | { type: 'FETCH' }
  | { type: 'SUCCESS'; data: FetchContext['data'] }
  | { type: 'ERROR'; error: string }
  | { type: 'RETRY' }
  | { type: 'RESET' };

// Create typed setup
const { createMachine, assign } = setup({
  types: {} as {
    context: FetchContext;
    events: FetchEvent;
  },
});

// Simulate API fetch
const fetchData = async () => {
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // 40% chance of failure to demonstrate retry
  if (Math.random() < 0.4) {
    throw new Error('Network error: Failed to fetch data');
  }

  return {
    id: Math.floor(Math.random() * 100),
    title: 'Successfully Fetched Post',
    body: "This data was fetched from a simulated API. The state machine ensures we can never be in 'loading' and 'error' states simultaneously.",
  };
};

// Create the fetch machine
const fetchMachine = createMachine({
  id: 'fetch',
  initial: 'idle',
  context: {
    data: null,
    error: null,
    retryCount: 0,
  },
  states: {
    idle: {
      on: {
        FETCH: { target: 'loading' },
      },
    },
    loading: {
      entry: [
        async ({ self }) => {
          try {
            const data = await fetchData();
            self.send({ type: 'SUCCESS', data });
          } catch (err) {
            self.send({ type: 'ERROR', error: (err as Error).message });
          }
        },
      ],
      on: {
        SUCCESS: {
          target: 'success',
          actions: [
            assign(({ event }) => {
              if (event.type !== 'SUCCESS') return {};
              return { data: event.data, error: null };
            }),
          ],
        },
        ERROR: {
          target: 'error',
          actions: [
            assign(({ context, event }) => {
              if (event.type !== 'ERROR') return {};
              return { error: event.error, retryCount: context.retryCount + 1 };
            }),
          ],
        },
      },
    },
    success: {
      on: {
        RESET: {
          target: 'idle',
          actions: [assign(() => ({ data: null, error: null, retryCount: 0 }))],
        },
        FETCH: { target: 'loading' },
      },
    },
    error: {
      on: {
        RETRY: { target: 'loading' },
        RESET: {
          target: 'idle',
          actions: [assign(() => ({ data: null, error: null, retryCount: 0 }))],
        },
      },
    },
  },
});

// Boolean-based approach for comparison
function useBooleanFetch() {
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [data, setData] = useState<FetchContext['data']>(null);
  const [error, setError] = useState<string | null>(null);

  const fetch = async () => {
    setIsLoading(true);
    // Bug: forgot to reset isError!
    try {
      const result = await fetchData();
      setData(result);
      setIsLoading(false);
      setIsError(false);
    } catch (err) {
      setError((err as Error).message);
      setIsLoading(false);
      setIsError(true);
    }
  };

  return { isLoading, isError, data, error, fetch };
}

export default function AsyncFetchDemo() {
  // State machine approach
  const [actor] = useState(() => new Actor(fetchMachine));
  const [snapshot, setSnapshot] = useState(actor.getSnapshot());

  // Boolean approach
  const booleanFetch = useBooleanFetch();

  useEffect(() => {
    const unsubscribe = actor.subscribe(setSnapshot);
    return unsubscribe;
  }, [actor]);

  const currentState = snapshot.value;
  const ctx = snapshot.context;

  return (
    <div className='min-h-screen bg-zinc-50 dark:bg-zinc-950 py-12 px-6'>
      <div className='mx-auto max-w-2xl'>
        <Link
          href='/'
          className='text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
        >
          &larr; Back to demos
        </Link>

        <h1 className='mt-6 mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50'>
          Async Data Fetching
        </h1>
        <p className='mb-6 text-zinc-600 dark:text-zinc-400'>
          Compare state machine vs boolean flags for managing async states.
        </p>

        <Tabs defaultValue='machine' className='space-y-6'>
          <TabsList className='grid w-full grid-cols-2'>
            <TabsTrigger value='machine'>State Machine</TabsTrigger>
            <TabsTrigger value='boolean'>Boolean Flags</TabsTrigger>
          </TabsList>

          <TabsContent value='machine'>
            <Card>
              <CardHeader>
                <div className='flex items-center justify-between'>
                  <CardTitle>State Machine Approach</CardTitle>
                  <Badge variant='outline'>{currentState}</Badge>
                </div>
                <CardDescription>
                  Impossible states are... impossible. Clean, predictable
                  behavior.
                </CardDescription>
              </CardHeader>

              <CardContent className='space-y-4'>
                <div className='min-h-[150px] flex items-center justify-center rounded-lg border bg-zinc-50 dark:bg-zinc-900 p-6'>
                  {currentState === 'idle' && (
                    <p className='text-zinc-500'>
                      Click the button to fetch data
                    </p>
                  )}
                  {currentState === 'loading' && (
                    <div className='flex flex-col items-center gap-3'>
                      <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 dark:border-zinc-100' />
                      <p className='text-sm text-zinc-500'>Fetching data...</p>
                    </div>
                  )}
                  {currentState === 'success' && ctx.data && (
                    <div className='text-center space-y-2'>
                      <p className='font-medium'>{ctx.data.title}</p>
                      <p className='text-sm text-zinc-600 dark:text-zinc-400'>
                        {ctx.data.body}
                      </p>
                      <Badge>ID: {ctx.data.id}</Badge>
                    </div>
                  )}
                  {currentState === 'error' && (
                    <div className='text-center space-y-2'>
                      <p className='text-red-600 dark:text-red-400'>
                        {ctx.error}
                      </p>
                      <p className='text-sm text-zinc-500'>
                        Retry count: {ctx.retryCount}
                      </p>
                    </div>
                  )}
                </div>

                <div className='flex gap-2'>
                  {currentState === 'idle' && (
                    <Button
                      onClick={() => actor.send({ type: 'FETCH' })}
                      className='w-full'
                    >
                      Fetch Data
                    </Button>
                  )}
                  {currentState === 'loading' && (
                    <Button disabled className='w-full'>
                      Loading...
                    </Button>
                  )}
                  {currentState === 'success' && (
                    <>
                      <Button
                        onClick={() => actor.send({ type: 'FETCH' })}
                        className='flex-1'
                      >
                        Refresh
                      </Button>
                      <Button
                        variant='outline'
                        onClick={() => actor.send({ type: 'RESET' })}
                        className='flex-1'
                      >
                        Reset
                      </Button>
                    </>
                  )}
                  {currentState === 'error' && (
                    <>
                      <Button
                        onClick={() => actor.send({ type: 'RETRY' })}
                        className='flex-1'
                      >
                        Retry
                      </Button>
                      <Button
                        variant='outline'
                        onClick={() => actor.send({ type: 'RESET' })}
                        className='flex-1'
                      >
                        Reset
                      </Button>
                    </>
                  )}
                </div>

                <div className='p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-sm'>
                  <p className='font-medium text-green-800 dark:text-green-300'>
                    State Machine Guarantees:
                  </p>
                  <ul className='mt-1 text-green-700 dark:text-green-400 space-y-1'>
                    <li>
                      • Only ONE state at a time (loading OR error OR success)
                    </li>
                    <li>• Transitions are explicit and validated</li>
                    <li>• Retry count automatically tracked in context</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='boolean'>
            <Card>
              <CardHeader>
                <div className='flex items-center justify-between'>
                  <CardTitle>Boolean Flags Approach</CardTitle>
                  <div className='flex gap-1'>
                    <Badge
                      variant={booleanFetch.isLoading ? 'default' : 'outline'}
                    >
                      loading: {String(booleanFetch.isLoading)}
                    </Badge>
                    <Badge
                      variant={booleanFetch.isError ? 'destructive' : 'outline'}
                    >
                      error: {String(booleanFetch.isError)}
                    </Badge>
                  </div>
                </div>
                <CardDescription>
                  Common pattern with potential for impossible states.
                </CardDescription>
              </CardHeader>

              <CardContent className='space-y-4'>
                <div className='min-h-[150px] flex items-center justify-center rounded-lg border bg-zinc-50 dark:bg-zinc-900 p-6'>
                  {!booleanFetch.isLoading &&
                    !booleanFetch.isError &&
                    !booleanFetch.data && (
                      <p className='text-zinc-500'>
                        Click the button to fetch data
                      </p>
                    )}
                  {booleanFetch.isLoading && (
                    <div className='flex flex-col items-center gap-3'>
                      <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 dark:border-zinc-100' />
                      <p className='text-sm text-zinc-500'>Fetching data...</p>
                    </div>
                  )}
                  {!booleanFetch.isLoading &&
                    booleanFetch.data &&
                    !booleanFetch.isError && (
                      <div className='text-center space-y-2'>
                        <p className='font-medium'>{booleanFetch.data.title}</p>
                        <p className='text-sm text-zinc-600 dark:text-zinc-400'>
                          {booleanFetch.data.body}
                        </p>
                        <Badge>ID: {booleanFetch.data.id}</Badge>
                      </div>
                    )}
                  {booleanFetch.isError && (
                    <div className='text-center space-y-2'>
                      <p className='text-red-600 dark:text-red-400'>
                        {booleanFetch.error}
                      </p>
                    </div>
                  )}
                </div>

                <Button
                  onClick={booleanFetch.fetch}
                  disabled={booleanFetch.isLoading}
                  className='w-full'
                >
                  {booleanFetch.isLoading ? 'Loading...' : 'Fetch Data'}
                </Button>

                <div className='p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-sm'>
                  <p className='font-medium text-amber-800 dark:text-amber-300'>
                    Potential Issues:
                  </p>
                  <ul className='mt-1 text-amber-700 dark:text-amber-400 space-y-1'>
                    <li>
                      • Can accidentally have isLoading && isError both true
                    </li>
                    <li>• Easy to forget resetting flags</li>
                    <li>• More conditions to check in render logic</li>
                    <li>• No built-in retry count tracking</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className='mt-8 p-4 rounded-lg bg-zinc-100 dark:bg-zinc-900'>
          <h3 className='font-medium mb-2 text-sm'>Key Takeaway:</h3>
          <p className='text-sm text-zinc-600 dark:text-zinc-400'>
            With booleans, you have 2^n possible combinations (4 with 2 flags).
            With state machines, you have exactly N states - no invalid
            combinations possible.
          </p>
        </div>
      </div>
    </div>
  );
}
