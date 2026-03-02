"use client";

import { useEffect, useRef } from "react";
import { useAuth, UserButton } from "@clerk/nextjs";
import { DotsVerticalIcon } from "@radix-ui/react-icons";
import { setUserContext, clearUserContext } from "@/lib/analytics";
import Link from "next/link";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ThemeToggle } from "./theme-toggle";

type NavProps = {
  initialUserId?: string | null;
};

export function Nav({ initialUserId }: NavProps = {}) {
  const { userId, isLoaded } = useAuth();
  const effectiveUserId = userId ?? initialUserId;
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!isLoaded) return;
    if (userId) {
      setUserContext(userId);
    } else if (prevUserIdRef.current) {
      // Only clear on sign-out transition (was signed in, now isn't)
      clearUserContext();
    }
    prevUserIdRef.current = userId;
  }, [isLoaded, userId]);

  if (!effectiveUserId) return null;

  return (
    <nav className="sticky top-0 z-50 border-b border-border-subtle bg-background/92 backdrop-blur-md">
      <div className="mx-auto flex h-[52px] max-w-4xl items-center justify-between px-4">
        <Link
          href="/today"
          className="text-base font-semibold tracking-tight text-foreground transition-opacity hover:opacity-80"
        >
          Volume
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-[--radius] text-muted-foreground transition-colors hover:bg-card hover:text-foreground md:hidden"
                aria-label="More options"
              >
                <DotsVerticalIcon className="h-5 w-5" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-48 p-1">
              <a
                href="mailto:feedback@volume.fitness"
                className="flex w-full items-center rounded-[calc(var(--radius)-2px)] px-3 py-2 text-sm text-foreground transition-colors hover:bg-card"
              >
                Feedback
              </a>
              <a
                href="https://mistystep.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center rounded-[calc(var(--radius)-2px)] px-3 py-2 text-sm text-foreground transition-colors hover:bg-card"
              >
                Misty Step
              </a>
              <Link
                href="/releases"
                className="flex w-full items-center rounded-[calc(var(--radius)-2px)] px-3 py-2 text-sm text-foreground transition-colors hover:bg-card"
              >
                Version
              </Link>
            </PopoverContent>
          </Popover>
          <div className="flex h-10 w-10 items-center justify-center">
            <UserButton
              afterSignOutUrl="/sign-in"
              appearance={{ elements: { avatarBox: "h-9 w-9" } }}
            />
          </div>
        </div>
      </div>
    </nav>
  );
}
