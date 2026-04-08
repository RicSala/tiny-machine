"use client";

import Link from "next/link";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const demos = [
  {
    title: "Async Search (Race Conditions)",
    description:
      "The classic bug everyone has shipped. Type quickly and watch stale responses get rejected.",
    href: "/demos/async-search",
    concepts: ["Guards", "Race Conditions", "Debounce", "Request ID"],
  },
  {
    title: "Session Timeout",
    description:
      "Idle detection with warning countdown. Stop moving your mouse and watch it happen.",
    href: "/demos/session-timeout",
    concepts: ["Timers", "Entry/Exit Actions", "Activity Tracking"],
  },
  {
    title: "Multi-Step Form",
    description:
      "A wizard that prevents invalid navigation and manages complex step progression with guards.",
    href: "/demos/form-wizard",
    concepts: ["States", "Transitions", "Guards", "Context"],
  },
  {
    title: "Async Data Fetch",
    description:
      "Shows how state machines prevent impossible states like 'loading AND error' simultaneously.",
    href: "/demos/async-fetch",
    concepts: ["States", "Actions", "Context", "Impossible States"],
  },
  {
    title: "Toggle with Confirmation",
    description:
      "Even a simple toggle can have hidden complexity when you add confirmation dialogs.",
    href: "/demos/toggle-confirm",
    concepts: ["States", "Transitions", "Entry Actions"],
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <main className="mx-auto max-w-4xl px-6 py-16">
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            @tinystack/machine
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Interactive demos showcasing the power of state machines
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            ~1KB gzipped • Type-safe • XState v5-inspired
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {demos.map((demo) => (
            <Link key={demo.href} href={demo.href}>
              <Card className="h-full transition-all hover:shadow-lg hover:border-zinc-400 dark:hover:border-zinc-600">
                <CardHeader>
                  <CardTitle className="text-lg">{demo.title}</CardTitle>
                  <CardDescription className="text-sm">
                    {demo.description}
                  </CardDescription>
                  <div className="flex flex-wrap gap-1 pt-3">
                    {demo.concepts.map((concept) => (
                      <Badge key={concept} variant="secondary" className="text-xs">
                        {concept}
                      </Badge>
                    ))}
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>

        <div className="mt-16 text-center text-sm text-zinc-500">
          <p>
            Learn more at{" "}
            <a
              href="https://github.com/RicSala/machine"
              className="font-medium text-zinc-900 underline dark:text-zinc-100"
            >
              github.com/RicSala/machine
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
