"use client";

import { useAuth } from "@clerk/nextjs";

export function Footer() {
  const { userId } = useAuth();
  const currentYear = new Date().getFullYear();

  // Hide footer for unauthenticated users (footer is integrated into landing)
  if (!userId) {
    return null;
  }

  return (
    <footer className="border-t mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-center text-sm text-muted-foreground">
          <p>© {currentYear} Volume</p>
        </div>
      </div>
    </footer>
  );
}
