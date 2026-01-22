import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { loadRelease, getAllVersions, loadManifest } from "@/lib/releases/loader";
import { CHANGE_TYPE_LABELS, CHANGE_TYPE_ORDER } from "@/lib/releases/types";
import type { ChangeType } from "@/lib/releases/types";
import { Footer } from "@/components/layout/footer";

interface PageProps {
  params: Promise<{ version: string }>;
}

export async function generateStaticParams() {
  const versions = getAllVersions();
  return versions.map((version) => ({ version }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { version } = await params;
  const release = loadRelease(version);
  if (!release) return { title: "Release Not Found — Volume" };

  return {
    title: `v${release.version} Release Notes — Volume`,
    description: release.productNotes.slice(0, 160),
  };
}

export default async function ReleasePage({ params }: PageProps) {
  const { version } = await params;
  const release = loadRelease(version);

  if (!release) {
    notFound();
  }

  const manifest = loadManifest();
  const versions = manifest?.versions || [];
  const currentIndex = versions.indexOf(release.version);
  const prevVersion = currentIndex < versions.length - 1 ? versions[currentIndex + 1] : null;
  const nextVersion = currentIndex > 0 ? versions[currentIndex - 1] : null;

  // Group changes by type
  const changesByType = new Map<ChangeType, typeof release.changes>();
  for (const change of release.changes) {
    const existing = changesByType.get(change.type) || [];
    existing.push(change);
    changesByType.set(change.type, existing);
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b-[3px] border-border bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/releases"
            className="font-mono text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2"
          >
            <span>←</span>
            <span>All Releases</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Title */}
          <div className="border-l-[4px] border-primary pl-6 mb-12">
            <h1 className="font-display text-5xl md:text-6xl tracking-tight uppercase mb-3">
              v{release.version}
            </h1>
            <p className="font-mono text-sm text-muted-foreground">
              Released{" "}
              {new Date(release.date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          {/* What's New (Product Notes) */}
          <section className="mb-12">
            <h2 className="font-display text-2xl uppercase tracking-tight mb-4 border-l-[3px] border-border pl-4">
              What&apos;s New
            </h2>
            <div className="prose prose-neutral dark:prose-invert max-w-none">
              {release.productNotes.split("\n\n").map((paragraph, i) => (
                <p key={i} className="text-foreground/90 leading-relaxed mb-4">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>

          {/* Technical Changelog */}
          <section className="mb-12">
            <h2 className="font-display text-2xl uppercase tracking-tight mb-4 border-l-[3px] border-border pl-4">
              Technical Changelog
            </h2>

            <div className="space-y-6">
              {CHANGE_TYPE_ORDER.map((type) => {
                const changes = changesByType.get(type);
                if (!changes?.length) return null;

                return (
                  <div key={type} className="border-l-[2px] border-border pl-4">
                    <h3 className="font-mono text-sm uppercase tracking-wider text-muted-foreground mb-2">
                      {CHANGE_TYPE_LABELS[type]}
                    </h3>
                    <ul className="space-y-1">
                      {changes.map((change, i) => (
                        <li
                          key={i}
                          className="text-foreground/90 text-sm leading-relaxed"
                        >
                          {change.breaking && (
                            <span className="text-destructive font-bold mr-1">
                              ⚠️
                            </span>
                          )}
                          {change.scope && (
                            <span className="font-mono text-xs text-muted-foreground mr-1">
                              [{change.scope}]
                            </span>
                          )}
                          {change.description}
                          {change.pr && (
                            <span className="font-mono text-xs text-muted-foreground ml-1">
                              (#{change.pr})
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Navigation */}
          <nav className="flex justify-between items-center pt-8 border-t-[2px] border-border">
            {prevVersion ? (
              <Link
                href={`/releases/${prevVersion}`}
                className="font-mono text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                ← v{prevVersion}
              </Link>
            ) : (
              <span />
            )}
            {nextVersion ? (
              <Link
                href={`/releases/${nextVersion}`}
                className="font-mono text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                v{nextVersion} →
              </Link>
            ) : (
              <span className="font-mono text-xs text-muted-foreground/50">
                Latest release
              </span>
            )}
          </nav>
        </div>
      </main>

      <Footer />
    </div>
  );
}
