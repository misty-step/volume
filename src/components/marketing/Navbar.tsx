"use client";

import { forwardRef, useState, type HTMLAttributes } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import { fadeInUp, slideIn, staggerContainer } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { NAV_LINKS, type NavLink } from "./constants";

export interface NavbarProps extends HTMLAttributes<HTMLElement> {}

export const Navbar = forwardRef<HTMLElement, NavbarProps>(function Navbar(
  { className, ...props },
  ref
) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const closeMenu = () => setIsMenuOpen(false);

  const logNavClick = (link: NavLink, device: "desktop" | "mobile") => {
    trackEvent("Marketing Nav Click", {
      target: link.href,
      device,
    });
  };

  const logCtaClick = (label: string) => {
    trackEvent("Marketing CTA Click", {
      placement: "navbar",
      label,
    });
  };

  return (
    <motion.nav
      ref={ref}
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      className={cn(
        "sticky top-0 z-50 border-b border-white/10 bg-background/80 backdrop-blur",
        className
      )}
      {...props}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-3 text-lg font-semibold tracking-tight"
          aria-label="Volume home"
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-base font-bold text-primary">
            V
          </span>
          <span className="text-base font-semibold sm:text-lg">Volume</span>
        </Link>

        <motion.div
          className="hidden items-center gap-6 text-sm font-medium lg:flex"
          variants={staggerContainer}
          initial="visible"
        >
          {NAV_LINKS.map((link) => (
            <NavLinkItem
              key={link.href}
              href={link.href}
              label={link.label}
              onClick={() => logNavClick(link, "desktop")}
            />
          ))}
        </motion.div>

        <div className="hidden items-center gap-3 lg:flex">
          <Button variant="ghost" asChild>
            <Link
              href="#how-it-works"
              onClick={() => logCtaClick("See how it works")}
            >
              See how it works
            </Link>
          </Button>
          <Button asChild>
            <Link
              href="/sign-up"
              onClick={() => logCtaClick("Get Started — free")}
            >
              Get Started — free
            </Link>
          </Button>
        </div>

        <div className="lg:hidden">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            {isMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            key="mobile-nav"
            variants={slideIn("right")}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, x: 32 }}
            transition={{ duration: 0.4 }}
            className="border-t border-white/10 bg-background/95 px-4 py-6 shadow-lg"
          >
            <div className="flex flex-col gap-4 text-base font-medium">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => {
                    logNavClick(link, "mobile");
                    closeMenu();
                  }}
                  className="text-muted-foreground transition hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <Button variant="outline" asChild onClick={closeMenu}>
                <Link
                  href="#how-it-works"
                  onClick={() => logCtaClick("See how it works")}
                >
                  See how it works
                </Link>
              </Button>
              <Button asChild onClick={closeMenu}>
                <Link
                  href="/sign-up"
                  onClick={() => logCtaClick("Get Started — free")}
                >
                  Get Started — free
                </Link>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
});

function NavLinkItem({
  href,
  label,
  onClick,
}: NavLink & { onClick?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="text-muted-foreground transition hover:text-foreground"
    >
      {label}
    </Link>
  );
}
