"use client";

import { useAuth, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";

type NavProps = {
  initialUserId?: string | null;
};

const navLinks = [
  { href: "/today", label: "Today" },
  { href: "/history", label: "History" },
  { href: "/analytics", label: "Analytics" },
  { href: "/settings", label: "Settings" },
];

export function Nav({ initialUserId }: NavProps = {}) {
  const { userId } = useAuth();
  const pathname = usePathname();
  const effectiveUserId = userId ?? initialUserId;

  // Determine if a nav link is active
  const isActive = (href: string) => {
    if (href === "/today") {
      return pathname === "/today";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  // Hide nav entirely when unauthenticated
  if (!effectiveUserId) {
    return null;
  }

  return (
    <nav className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link
              href="/today"
              className="text-xl font-bold tracking-tight hover:text-primary transition-colors"
            >
              Volume
            </Link>
            {/* Desktop navigation links - hidden on mobile */}
            <div className="hidden md:flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm transition-colors duration-200 ${
                    isActive(link.href)
                      ? "text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="h-10 w-10 flex items-center justify-center">
              <UserButton
                afterSignOutUrl="/sign-in"
                appearance={{
                  elements: {
                    avatarBox: "h-9 w-9",
                  },
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
