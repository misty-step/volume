import Link from "next/link";
import type { Metadata } from "next";
import { loadAllReleases } from "@/lib/releases/loader";
import { Footer } from "@/components/layout/footer";

export const metadata: Metadata = {
  title: "Release Notes — Volume",
  description: "See what's new in Volume. Release history and changelog.",
};

export default function ReleasesPage() {
  const releases = loadAllReleases();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b-[3px] border-border bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/"
            className="font-display text-2xl tracking-tight hover:text-primary transition-colors inline-block"
          >
            VOLUME
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Title */}
          <div className="border-l-[4px] border-primary pl-6 mb-12">
            <h1 className="font-display text-5xl md:text-6xl tracking-tight uppercase mb-3">
              Release Notes
            </h1>
            <p className="font-mono text-sm text-muted-foreground">
              What&apos;s new in Volume
            </p>
          </div>

          {/* Release List */}
          <div className="space-y-8">
            {releases.map((release) => {
              const featCount = release.changes.filter(
                (c) => c.type === "feat"
              ).length;
              const fixCount = release.changes.filter(
                (c) => c.type === "fix"
              ).length;

              return (
                <Link
                  key={release.version}
                  href={`/releases/${release.version}`}
                  className="block border-l-[3px] border-border hover:border-primary pl-6 py-4 transition-colors group"
                >
                  <div className="flex items-baseline justify-between mb-2">
                    <h2 className="font-display text-2xl uppercase tracking-tight group-hover:text-primary transition-colors">
                      v{release.version}
                    </h2>
                    <span className="font-mono text-xs text-muted-foreground">
                      {new Date(release.date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>

                  {/* Product notes preview */}
                  <p className="text-foreground/80 leading-relaxed line-clamp-2 mb-3">
                    {release.productNotes.split("\n")[0]}
                  </p>

                  {/* Change summary badges */}
                  <div className="flex gap-2">
                    {featCount > 0 && (
                      <span className="font-mono text-xs px-2 py-0.5 bg-primary/10 text-primary border border-primary/20">
                        {featCount} {featCount === 1 ? "feature" : "features"}
                      </span>
                    )}
                    {fixCount > 0 && (
                      <span className="font-mono text-xs px-2 py-0.5 bg-muted text-muted-foreground border border-border">
                        {fixCount} {fixCount === 1 ? "fix" : "fixes"}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
