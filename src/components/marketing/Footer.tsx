import Link from "next/link";
import { forwardRef, type HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

import { FOOTER_LINK_GROUPS, type FooterLinkGroup } from "./constants";

export interface FooterProps extends HTMLAttributes<HTMLElement> {}

export const Footer = forwardRef<HTMLElement, FooterProps>(function Footer(
  { className, ...props },
  ref
) {
  return (
    <footer
      ref={ref}
      className={cn("border-t bg-background/80", className)}
      {...props}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-12 px-4 py-12 sm:px-6 lg:flex-row lg:justify-between lg:px-8">
        <div className="max-w-md space-y-4">
          <div className="flex items-center gap-3 text-lg font-semibold tracking-tight">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-base font-bold text-primary">
              V
            </span>
            <span className="text-base font-semibold sm:text-lg">Volume</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Track every set in seconds. Stay consistent with clear insights and
            a calm interface built for real gyms.
          </p>
          <p className="text-xs text-muted-foreground/80">
            © {new Date().getFullYear()} Volume. Train with clarity.
          </p>
        </div>

        <div className="grid flex-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {FOOTER_LINK_GROUPS.map((group) => (
            <FooterColumn key={group.title} group={group} />
          ))}
        </div>
      </div>
    </footer>
  );
});

function FooterColumn({ group }: { group: FooterLinkGroup }) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground/80">{group.title}</p>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {group.links.map((link) => (
          <li key={`${group.title}-${link.label}`}>
            {isExternal(link.href) ? (
              <a
                href={link.href}
                target={link.href.startsWith("http") ? "_blank" : undefined}
                rel={link.href.startsWith("http") ? "noreferrer" : undefined}
                className="transition hover:text-foreground"
              >
                {link.label}
              </a>
            ) : (
              <Link
                href={link.href}
                className="transition hover:text-foreground"
              >
                {link.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function isExternal(href: string) {
  return href.startsWith("http") || href.startsWith("mailto:");
}
