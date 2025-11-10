"use client";

import { SignUp } from "@clerk/nextjs";

export function UnauthenticatedLanding() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Main content area - two columns */}
      <main className="flex-1 grid lg:grid-cols-2">
        {/* Left section - Branding */}
        <section className="p-8 lg:p-16 flex items-center justify-center">
          <div className="w-full max-w-2xl">
            <h1 className="text-7xl sm:text-8xl lg:text-9xl font-black tracking-tight mb-6 animate-in fade-in slide-in-from-left-8 duration-700">
              Volume
            </h1>
            <p className="text-lg sm:text-xl lg:text-2xl text-muted-foreground animate-in fade-in slide-in-from-left-8 duration-700 delay-150">
              Log sets. See progress.
            </p>
          </div>
        </section>

        {/* Right section - Auth */}
        <section className="p-8 lg:p-16 bg-muted/30 flex items-center justify-center animate-in fade-in slide-in-from-right-8 duration-700 delay-150">
          <div className="w-full max-w-md">
            <SignUp
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "shadow-xl",
                },
              }}
            />
          </div>
        </section>
      </main>

      {/* Footer - full width */}
      <footer className="border-t py-4 px-8 lg:px-16 animate-in fade-in duration-700 delay-300">
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Volume
        </p>
      </footer>
    </div>
  );
}
