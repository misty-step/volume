"use client";

import Link from "next/link";
import { clientVersion } from "@/lib/version";

export function Footer() {
  const currentYear = new Date().getFullYear();
  const version = clientVersion;

  return (
    <footer className="border-t-[3px] border-border mt-auto bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {/* Grid layout - 4 columns on desktop, stack on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-8">
          {/* Legal Section */}
          <div className="space-y-2">
            <h3 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Legal
            </h3>
            <div className="flex flex-col gap-1.5 font-mono text-sm">
              <Link
                href="/terms"
                className="text-foreground hover:text-primary transition-colors w-fit"
              >
                Terms of Service
              </Link>
              <Link
                href="/privacy"
                className="text-foreground hover:text-primary transition-colors w-fit"
              >
                Privacy Policy
              </Link>
            </div>
          </div>

          {/* Company Section */}
          <div className="space-y-2 pt-4 md:pt-0 border-t-[3px] md:border-t-0 border-border">
            <h3 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Company
            </h3>
            <a
              href="https://mistystep.io"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-sm text-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5"
            >
              A Misty Step Project
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </div>

          {/* Support Section */}
          <div className="space-y-2 pt-4 md:pt-0 border-t-[3px] md:border-t-0 border-border">
            <h3 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Support
            </h3>
            <a
              href="mailto:hello@mistystep.io"
              className="font-mono text-sm text-primary hover:underline inline-block"
            >
              Feedback & Support
            </a>
          </div>

          {/* Copyright Section */}
          <div className="space-y-2 pt-4 md:pt-0 border-t-[3px] md:border-t-0 border-border">
            <h3 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              &nbsp;
            </h3>
            <div className="font-mono text-sm text-muted-foreground space-y-0.5">
              <p>© {currentYear} Volume</p>
              <p className="text-xs text-muted-foreground/80">v{version}</p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
