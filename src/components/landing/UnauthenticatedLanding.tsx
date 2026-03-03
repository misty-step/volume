"use client";

import Link from "next/link";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { PlatformStats } from "./PlatformStats";

export function UnauthenticatedLanding() {
  return (
    <div
      data-theme="light"
      className="relative min-h-dvh bg-background font-sans"
    >
      {/* Dot grid pattern */}
      <div className="dot-grid-pattern" />

      {/* Nav */}
      <header className="relative z-10 flex h-[52px] items-center justify-between px-6 md:px-16">
        <span className="text-base font-semibold tracking-tight text-foreground">
          Volume
        </span>
        <SignInButton mode="modal">
          <button
            type="button"
            className="inline-flex min-h-[44px] items-center rounded-[--radius] border border-border bg-transparent px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-card"
          >
            Sign in
          </button>
        </SignInButton>
      </header>

      {/* Hero — left-aligned */}
      <section className="relative z-10 flex min-h-[calc(100dvh-52px)] flex-col justify-center px-6 md:px-16">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Workout tracker
        </p>
        <h1 className="text-[clamp(3.5rem,10vw,6rem)] font-[800] leading-[0.92] tracking-[-0.03em] text-foreground">
          Volume.
        </h1>
        <p className="mt-4 max-w-[42ch] text-[1.1rem] leading-relaxed text-muted-foreground">
          Log sets in seconds. Let the AI coach surface what actually matters.
        </p>
        <div className="mt-8 flex items-center gap-3">
          <SignUpButton mode="modal">
            <button
              type="button"
              className="rounded-[--radius] bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90 active:scale-[0.97]"
            >
              Start for free →
            </button>
          </SignUpButton>
        </div>
        <div className="mt-12">
          <PlatformStats />
        </div>
      </section>

      {/* Feature tiles */}
      <section className="relative z-10 px-6 pb-16 md:px-16">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {[
            {
              title: "Log fast",
              body: 'Type "12 pushups" or use the quick-log form. Sets are captured instantly.',
            },
            {
              title: "Track PRs",
              body: "Personal records detected automatically. Celebrate every milestone.",
            },
            {
              title: "AI insights",
              body: "Ask the coach anything — weekly volume, exercise trends, what to focus on.",
            },
            {
              title: "Full history",
              body: "Every set ever logged. Filter by exercise, week, or muscle group.",
            },
            {
              title: "Smart coach",
              body: "Context-aware coaching based on your actual training data.",
            },
            {
              title: "Any device",
              body: "Mobile-first design. Works on iPhone, Android, desktop.",
            },
          ].map((tile) => (
            <div
              key={tile.title}
              className="rounded-[--radius] border border-border bg-card p-[14px]"
            >
              <p className="text-sm font-semibold text-foreground">
                {tile.title}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {tile.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border px-6 py-6 text-xs text-muted-foreground md:px-16">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span>© {new Date().getFullYear()} Volume</span>
          <div className="flex gap-4">
            <Link
              href="/privacy"
              className="inline-flex min-h-[44px] items-center transition-colors hover:text-foreground"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="inline-flex min-h-[44px] items-center transition-colors hover:text-foreground"
            >
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
