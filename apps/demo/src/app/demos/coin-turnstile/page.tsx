'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Actor, setup } from '@tinystack/machine';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface TurnstileContext {
  coins: number;
  totalInserted: number;
  lastTransition: string;
  history: string[];
}

type TurnstileEvent =
  | { type: 'INSERT_COIN' }
  | { type: 'PUSH' }
  | { type: 'RESET' };

const REQUIRED_COINS = 3;

const appendHistory = (
  history: string[],
  message: string
) => [...history.slice(-5), message];

const { createMachine, assign } = setup({
  types: {} as {
    context: TurnstileContext;
    events: TurnstileEvent;
  },
});

const turnstileMachine = createMachine({
  id: 'coinTurnstile',
  initial: 'locked',
  context: {
    coins: 0,
    totalInserted: 0,
    lastTransition: 'Waiting for coin',
    history: ['Machine booted in locked state'],
  },
  on: {
    RESET: {
      target: 'locked',
      actions: [
        assign(({ context }) => ({
          coins: 0,
          totalInserted: 0,
          lastTransition: 'Machine reset',
          history: appendHistory(context.history, 'Reset back to locked'),
        })),
      ],
    },
  },
  states: {
    locked: {
      on: {
        INSERT_COIN: [
          {
            guard: (context) => context.coins + 1 >= REQUIRED_COINS,
            target: 'unlocked',
            actions: [
              assign(({ context }) => ({
                coins: context.coins + 1,
                totalInserted: context.totalInserted + 1,
                lastTransition: 'Third coin hit the unlock branch',
                history: appendHistory(
                  context.history,
                  `Coin ${context.coins + 1}: unlock branch matched`
                ),
              })),
            ],
          },
          {
            actions: [
              assign(({ context }) => ({
                coins: context.coins + 1,
                totalInserted: context.totalInserted + 1,
                lastTransition: 'Fallback branch: stay locked and count coin',
                history: appendHistory(
                  context.history,
                  `Coin ${context.coins + 1}: fallback branch kept it locked`
                ),
              })),
            ],
          },
        ],
        PUSH: {
          actions: [
            assign(({ context }) => ({
              lastTransition: 'Push ignored while locked',
              history: appendHistory(
                context.history,
                'Tried to push while locked'
              ),
            })),
          ],
        },
      },
    },
    unlocked: {
      on: {
        INSERT_COIN: {
          actions: [
            assign(({ context }) => ({
              coins: context.coins + 1,
              totalInserted: context.totalInserted + 1,
              lastTransition: 'Already unlocked, but coin still counted',
              history: appendHistory(
                context.history,
                `Extra coin inserted while unlocked (${context.coins + 1})`
              ),
            })),
          ],
        },
        PUSH: {
          target: 'locked',
          actions: [
            assign(({ context }) => ({
              coins: 0,
              lastTransition: 'Gate pushed, machine relocked',
              history: appendHistory(
                context.history,
                `Pushed through after ${context.coins} coins`
              ),
            })),
          ],
        },
      },
    },
  },
});

const codeSample = `INSERT_COIN: [
  {
    guard: (context) => context.coins + 1 >= 3,
    target: 'unlocked',
    actions: [
      assign(({ context }) => ({
        coins: context.coins + 1,
      })),
    ],
  },
  {
    actions: [
      assign(({ context }) => ({
        coins: context.coins + 1,
      })),
    ],
  },
]`;

export default function CoinTurnstileDemo() {
  const [actor] = useState(() => new Actor(turnstileMachine));
  const [snapshot, setSnapshot] = useState(actor.getSnapshot());

  useEffect(() => {
    const unsubscribe = actor.subscribe(setSnapshot);
    return unsubscribe;
  }, [actor]);

  const { coins, totalInserted, lastTransition, history } = snapshot.context;
  const progress = Math.min((coins / REQUIRED_COINS) * 100, 100);
  const coinsRemaining = Math.max(REQUIRED_COINS - coins, 0);
  const isUnlocked = snapshot.value === 'unlocked';

  return (
    <div className='min-h-screen bg-zinc-50 dark:bg-zinc-950 py-12 px-6'>
      <div className='mx-auto max-w-5xl'>
        <Link
          href='/'
          className='text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
        >
          &larr; Back to demos
        </Link>

        <div className='mt-6 mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between'>
          <div className='max-w-2xl'>
            <div className='mb-3 flex flex-wrap items-center gap-2'>
              <Badge variant='outline'>Transition Arrays</Badge>
              <Badge variant='outline'>First Match Wins</Badge>
              <Badge variant='outline'>Targetless Fallback</Badge>
            </div>
            <h1 className='text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50'>
              Coin Turnstile
            </h1>
            <p className='mt-3 text-zinc-600 dark:text-zinc-400'>
              This demo shows the XState-style branching model: on every coin,
              the machine tries the unlock branch first, then falls back to a
              targetless transition that keeps counting coins while staying
              locked.
            </p>
          </div>

          <div className='rounded-2xl border border-zinc-200 bg-white/80 px-4 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80'>
            <p className='text-xs uppercase tracking-[0.2em] text-zinc-500'>
              Current State
            </p>
            <p className='mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50'>
              {snapshot.value}
            </p>
          </div>
        </div>

        <div className='grid gap-6 lg:grid-cols-[1.2fr_0.8fr]'>
          <Card className='overflow-hidden border-zinc-200 bg-white/80 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80'>
            <CardHeader className='border-b border-zinc-100 dark:border-zinc-800'>
              <CardTitle>Interactive Machine</CardTitle>
              <CardDescription>
                Insert coins until the first guarded transition becomes true.
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-6 p-6'>
              <div className='rounded-3xl border border-zinc-200 bg-gradient-to-br from-amber-100 via-white to-emerald-100 p-6 dark:border-zinc-800 dark:from-amber-950/40 dark:via-zinc-950 dark:to-emerald-950/40'>
                <div className='mb-5 flex items-center justify-between'>
                  <div>
                    <p className='text-sm uppercase tracking-[0.2em] text-zinc-500'>
                      Gate Status
                    </p>
                    <p className='mt-1 text-3xl font-semibold text-zinc-900 dark:text-zinc-50'>
                      {isUnlocked ? 'Unlocked' : 'Locked'}
                    </p>
                  </div>
                  <div
                    className={`rounded-full px-4 py-2 text-sm font-medium ${
                      isUnlocked
                        ? 'bg-emerald-500 text-white'
                        : 'bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900'
                    }`}
                  >
                    {isUnlocked ? 'Pass through' : `${coinsRemaining} coin${coinsRemaining === 1 ? '' : 's'} to go`}
                  </div>
                </div>

                <div className='space-y-3'>
                  <div className='flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-400'>
                    <span>Unlock progress</span>
                    <span>{coins}/{REQUIRED_COINS} coins</span>
                  </div>
                  <Progress value={progress} className='h-3' />
                </div>

                <div className='mt-6 grid gap-3 sm:grid-cols-3'>
                  <Button onClick={() => actor.send({ type: 'INSERT_COIN' })}>
                    Insert Coin
                  </Button>
                  <Button
                    variant='secondary'
                    onClick={() => actor.send({ type: 'PUSH' })}
                  >
                    Push Gate
                  </Button>
                  <Button
                    variant='outline'
                    onClick={() => actor.send({ type: 'RESET' })}
                  >
                    Reset
                  </Button>
                </div>
              </div>

              <div className='grid gap-4 md:grid-cols-3'>
                <div className='rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800'>
                  <p className='text-xs uppercase tracking-[0.2em] text-zinc-500'>
                    Coins In State
                  </p>
                  <p className='mt-2 text-3xl font-semibold'>{coins}</p>
                </div>
                <div className='rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800'>
                  <p className='text-xs uppercase tracking-[0.2em] text-zinc-500'>
                    Total Inserted
                  </p>
                  <p className='mt-2 text-3xl font-semibold'>{totalInserted}</p>
                </div>
                <div className='rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800'>
                  <p className='text-xs uppercase tracking-[0.2em] text-zinc-500'>
                    Last Branch
                  </p>
                  <p className='mt-2 text-sm leading-6 text-zinc-700 dark:text-zinc-300'>
                    {lastTransition}
                  </p>
                </div>
              </div>

              <div className='rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950'>
                <p className='text-xs uppercase tracking-[0.2em] text-zinc-500'>
                  Recent History
                </p>
                <div className='mt-3 space-y-2'>
                  {[...history].reverse().map((entry) => (
                    <div
                      key={entry}
                      className='rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300'
                    >
                      {entry}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className='space-y-6'>
            <Card className='border-zinc-200 bg-white/80 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80'>
              <CardHeader>
                <CardTitle>Why This Matters</CardTitle>
                <CardDescription>
                  The same event can produce different results without becoming
                  ambiguous.
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400'>
                <p>
                  While the machine is <strong className='text-zinc-900 dark:text-zinc-50'>locked</strong>, every
                  <code className='mx-1 rounded bg-zinc-100 px-1 py-0.5 dark:bg-zinc-800'>INSERT_COIN</code>
                  event checks the array top to bottom.
                </p>
                <p>
                  If the first branch&apos;s <code className='mx-1 rounded bg-zinc-100 px-1 py-0.5 dark:bg-zinc-800'>guard</code> passes,
                  the machine unlocks. Otherwise the fallback branch runs and the
                  state stays locked while context still updates.
                </p>
              </CardContent>
            </Card>

            <Card className='border-zinc-200 bg-white/80 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/80'>
              <CardHeader>
                <CardTitle>Machine Snippet</CardTitle>
                <CardDescription>
                  This is the transition-array shape that powers the demo.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className='overflow-x-auto rounded-2xl bg-zinc-950 p-4 text-sm leading-6 text-zinc-100'>
                  <code>{codeSample}</code>
                </pre>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
