"use client";

import { useAuth, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

type NavProps = {
  initialUserId?: string | null;
};

export function Nav({ initialUserId }: NavProps = {}) {
  const { userId } = useAuth();
  const effectiveUserId = userId ?? initialUserId;

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
