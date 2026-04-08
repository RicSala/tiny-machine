'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { setup, Actor } from '@tinystack/machine';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

// Define types
interface FormContext {
  name: string;
  email: string;
  plan: 'free' | 'pro' | 'enterprise' | '';
  errors: Record<string, string>;
}

type FormEvent =
  | { type: 'NEXT' }
  | { type: 'BACK' }
  | { type: 'UPDATE_FIELD'; field: keyof FormContext; value: string }
  | { type: 'SUBMIT' }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; error: string }
  | { type: 'RESET' };

// Create typed setup
const { createMachine, assign } = setup({
  types: {} as {
    context: FormContext;
    events: FormEvent;
  },
});

// Create the form wizard machine
const formWizardMachine = createMachine({
  id: 'formWizard',
  initial: 'personalInfo',
  context: {
    name: '',
    email: '',
    plan: '',
    errors: {},
  },
  states: {
    personalInfo: {
      on: {
        NEXT: {
          target: 'planSelection',
          guard: (ctx) =>
            ctx.name.length > 0 && ctx.email.includes('@'),
          actions: [assign(() => ({ errors: {} }))],
        },
        UPDATE_FIELD: {
          actions: [
            assign(({ event }) => {
              if (event.type !== 'UPDATE_FIELD') return {};
              return { [event.field]: event.value };
            }),
          ],
        },
      },
    },
    planSelection: {
      on: {
        NEXT: {
          target: 'review',
          guard: (ctx) => ctx.plan !== '',
        },
        BACK: { target: 'personalInfo' },
        UPDATE_FIELD: {
          actions: [
            assign(({ event }) => {
              if (event.type !== 'UPDATE_FIELD') return {};
              return { [event.field]: event.value };
            }),
          ],
        },
      },
    },
    review: {
      on: {
        SUBMIT: { target: 'submitting' },
        BACK: { target: 'planSelection' },
      },
    },
    submitting: {
      entry: [
        {
          type: 'simulateSubmit',
          exec: ({ self }) => {
            setTimeout(() => {
              if (Math.random() > 0.3) {
                self.send({ type: 'SUBMIT_SUCCESS' });
              } else {
                self.send({
                  type: 'SUBMIT_ERROR',
                  error: 'Network error. Please try again.',
                });
              }
            }, 1500);
          },
        },
      ],
      on: {
        SUBMIT_SUCCESS: { target: 'success' },
        SUBMIT_ERROR: {
          target: 'review',
          actions: [
            assign(({ event }) => {
              if (event.type !== 'SUBMIT_ERROR') return {};
              return { errors: { submit: event.error } };
            }),
          ],
        },
      },
    },
    success: {
      on: {
        RESET: { target: 'personalInfo' },
      },
      entry: [
        assign(() => ({
          name: '',
          email: '',
          plan: '' as const,
          errors: {},
        })),
      ],
    },
  },
});

const steps = ['personalInfo', 'planSelection', 'review', 'success'] as const;
const stepLabels = {
  personalInfo: 'Personal Info',
  planSelection: 'Select Plan',
  review: 'Review',
  submitting: 'Submitting',
  success: 'Complete',
};

export default function FormWizardDemo() {
  const [actor] = useState(() => new Actor(formWizardMachine));
  const [snapshot, setSnapshot] = useState(actor.getSnapshot());

  useEffect(() => {
    const unsubscribe = actor.subscribe(setSnapshot);
    return unsubscribe;
  }, [actor]);

  const currentStep = snapshot.value;
  const ctx = snapshot.context;
  const stepIndex = steps.indexOf(currentStep as (typeof steps)[number]);
  const progress =
    currentStep === 'submitting' ? 75 : ((stepIndex + 1) / steps.length) * 100;

  return (
    <div className='min-h-screen bg-zinc-50 dark:bg-zinc-950 py-12 px-6'>
      <div className='mx-auto max-w-lg'>
        <Link
          href='/'
          className='text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
        >
          &larr; Back to demos
        </Link>

        <h1 className='mt-6 mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50'>
          Multi-Step Form Wizard
        </h1>
        <p className='mb-6 text-zinc-600 dark:text-zinc-400'>
          State machines prevent invalid navigation and manage step progression.
        </p>

        <div className='mb-6'>
          <div className='flex justify-between text-sm mb-2'>
            <span className='text-zinc-600 dark:text-zinc-400'>
              {stepLabels[currentStep as keyof typeof stepLabels]}
            </span>
            <Badge variant='outline'>{currentStep}</Badge>
          </div>
          <Progress value={progress} className='h-2' />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {currentStep === 'personalInfo' && 'Your Information'}
              {currentStep === 'planSelection' && 'Choose Your Plan'}
              {currentStep === 'review' && 'Review & Submit'}
              {currentStep === 'submitting' && 'Processing...'}
              {currentStep === 'success' && 'Welcome!'}
            </CardTitle>
            <CardDescription>
              {currentStep === 'personalInfo' &&
                'Enter your name and email to get started.'}
              {currentStep === 'planSelection' &&
                'Select the plan that works best for you.'}
              {currentStep === 'review' &&
                'Please review your information before submitting.'}
              {currentStep === 'submitting' &&
                'Please wait while we process your submission.'}
              {currentStep === 'success' &&
                'Your account has been created successfully.'}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {currentStep === 'personalInfo' && (
              <div className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='name'>Name</Label>
                  <Input
                    id='name'
                    value={ctx.name}
                    onChange={(e) =>
                      actor.send({
                        type: 'UPDATE_FIELD',
                        field: 'name',
                        value: e.target.value,
                      })
                    }
                    placeholder='John Doe'
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='email'>Email</Label>
                  <Input
                    id='email'
                    type='email'
                    value={ctx.email}
                    onChange={(e) =>
                      actor.send({
                        type: 'UPDATE_FIELD',
                        field: 'email',
                        value: e.target.value,
                      })
                    }
                    placeholder='john@example.com'
                  />
                </div>
              </div>
            )}

            {currentStep === 'planSelection' && (
              <div className='grid gap-3'>
                {(['free', 'pro', 'enterprise'] as const).map((plan) => (
                  <button
                    key={plan}
                    onClick={() =>
                      actor.send({
                        type: 'UPDATE_FIELD',
                        field: 'plan',
                        value: plan,
                      })
                    }
                    className={`p-4 rounded-lg border text-left transition-all ${
                      ctx.plan === plan
                        ? 'border-zinc-900 bg-zinc-100 dark:border-zinc-100 dark:bg-zinc-800'
                        : 'border-zinc-200 hover:border-zinc-400 dark:border-zinc-700'
                    }`}
                  >
                    <div className='font-medium capitalize'>{plan}</div>
                    <div className='text-sm text-zinc-500'>
                      {plan === 'free' && '$0/month - Basic features'}
                      {plan === 'pro' && '$19/month - Advanced features'}
                      {plan === 'enterprise' &&
                        '$99/month - Everything included'}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {currentStep === 'review' && (
              <div className='space-y-4'>
                {ctx.errors.submit && (
                  <div className='p-3 rounded-lg bg-red-50 text-red-700 text-sm dark:bg-red-900/20 dark:text-red-400'>
                    {ctx.errors.submit}
                  </div>
                )}
                <div className='space-y-2 text-sm'>
                  <div className='flex justify-between py-2 border-b'>
                    <span className='text-zinc-500'>Name</span>
                    <span className='font-medium'>{ctx.name}</span>
                  </div>
                  <div className='flex justify-between py-2 border-b'>
                    <span className='text-zinc-500'>Email</span>
                    <span className='font-medium'>{ctx.email}</span>
                  </div>
                  <div className='flex justify-between py-2'>
                    <span className='text-zinc-500'>Plan</span>
                    <span className='font-medium capitalize'>{ctx.plan}</span>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 'submitting' && (
              <div className='flex items-center justify-center py-8'>
                <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-zinc-900 dark:border-zinc-100' />
              </div>
            )}

            {currentStep === 'success' && (
              <div className='text-center py-4'>
                <div className='text-4xl mb-4'>&#10003;</div>
                <p className='text-zinc-600 dark:text-zinc-400'>
                  Check your email for next steps.
                </p>
              </div>
            )}
          </CardContent>

          <CardFooter className='flex justify-between'>
            {currentStep !== 'success' && currentStep !== 'submitting' && (
              <>
                <Button
                  variant='outline'
                  onClick={() => actor.send({ type: 'BACK' })}
                  disabled={currentStep === 'personalInfo'}
                >
                  Back
                </Button>
                {currentStep === 'review' ? (
                  <Button onClick={() => actor.send({ type: 'SUBMIT' })}>
                    Submit
                  </Button>
                ) : (
                  <Button
                    onClick={() => actor.send({ type: 'NEXT' })}
                    disabled={!formWizardMachine.can(snapshot, { type: 'NEXT' })}
                  >
                    Next
                  </Button>
                )}
              </>
            )}
            {currentStep === 'success' && (
              <Button
                onClick={() => actor.send({ type: 'RESET' })}
                className='w-full'
              >
                Start Over
              </Button>
            )}
          </CardFooter>
        </Card>

        <div className='mt-8 p-4 rounded-lg bg-zinc-100 dark:bg-zinc-900'>
          <h3 className='font-medium mb-2 text-sm'>State Machine Benefits:</h3>
          <ul className='text-sm text-zinc-600 dark:text-zinc-400 space-y-1'>
            <li>• Guards prevent advancing without valid data</li>
            <li>• Can&apos;t go back during submission (impossible state)</li>
            <li>• Clear state visualization at every step</li>
            <li>• Retry logic built into state transitions</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
