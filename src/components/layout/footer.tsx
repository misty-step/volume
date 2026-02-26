"use client";

import { displayVersion } from "@/lib/version";

export function Footer() {
  const currentYear = new Date().getFullYear();
  const version = displayVersion;

  return (
    <footer className="hidden md:block border-t border-border-subtle mt-auto bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {/* Grid layout - 3 columns on desktop */}
        <div className="grid grid-cols-3 gap-8">
          {/* Company Section */}
          <div className="space-y-2">
            <h3 className="text-muted-foreground text-xs uppercase tracking-wider">
              Company
            </h3>
            <a
              href="https://mistystep.io"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-muted-foreground text-xs transition-colors hover:text-foreground"
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
          <div className="space-y-2">
            <h3 className="text-muted-foreground text-xs uppercase tracking-wider">
              Support
            </h3>
            <a
              href="mailto:hello@mistystep.io"
              className="inline-block text-muted-foreground text-xs transition-colors hover:text-foreground hover:underline"
            >
              Feedback & Support
            </a>
          </div>

          {/* Copyright Section - no heading, aligned with other sections' content */}
          <div className="pt-6">
            <div className="text-muted-foreground text-xs space-y-0.5">
              <p>© {currentYear} Volume</p>
              <a
                href={`/releases/${version}`}
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                v{version}
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
