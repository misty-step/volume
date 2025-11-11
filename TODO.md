# TODO: Marketing Page Implementation

Last updated: 2025-11-10

## Context

- **Vision**: TASK.md - Professional marketing site with Performance Lab aesthetic + calm hero
- **Current State**: Basic two-column landing (UnauthenticatedLanding.tsx)
- **Architecture**: Modular sections under `src/components/marketing/*`
- **Stack**: Next.js 15, Tailwind, shadcn/ui, Framer Motion, Vercel Analytics
- **Patterns**: Follow existing component structure (ui/, analytics/, dashboard/)

## Phase 1: Foundation & Structure (6-8h)

- [x] Install Framer Motion & create motion system

  ```
  Files: package.json, src/lib/motion.ts (new)
  Commands: pnpm add framer-motion
  Architecture: Centralize motion variants with prefers-reduced-motion guard
  Success: fadeInUp, staggerContainer, slideIn, scaleIn exported; motion respects user preferences
  Test: Import motion primitives, verify reduced-motion detection
  Time: 1h

  Work Log:
  - Installed framer-motion@12.23.24
  - Created motion.ts with 4 core variants (fadeInUp, slideIn, scaleIn, staggerContainer)
  - Applied code-simplicity-reviewer recommendations:
    * Removed withReducedMotion() helper (Framer handles automatically)
    * Consolidated slideInLeft/Right into slideIn(direction) factory
    * Removed staggerContainer opacity side effects
    * 50% LOC reduction (178→70 lines)
  - Created comprehensive test suite (7 tests, all passing)
  - All tests pass, TypeScript clean
  ```

- [x] Create marketing component foundation (Navbar, Footer, Hero)

  ```
  Files:
    src/components/marketing/Navbar.tsx (new)
    src/components/marketing/Footer.tsx (new)
    src/components/marketing/Hero.tsx (new)
  Pattern: Follow ui/ component structure (forwardRef, cn() utility, Card/Button)
  Copy: TASK.md section 5 (hero headline, CTAs, navbar links)
  Success: Sticky nav with dual CTAs, footer with links, hero two-column layout
  Test: Components render, responsive mobile/desktop, motion animations work
  Dependencies: Framer Motion installed
  Time: 2h
  ```

- [x] Build Benefits & Social Proof sections

  ```
  Files:
    src/components/marketing/Benefits.tsx (new)
    src/components/marketing/SocialProof.tsx (new)
  Pattern: Grid layout with Card, Lucide icons, staggered animations
  Copy: TASK.md section 8 (benefits copy)
  Success: 4-6 benefit cards with icons, social proof strip/avatars
  Test: Hover states, motion staggers correctly
  Dependencies: Motion system, Card/Button components
  Time: 1.5h
  ```

- [x] Implement How It Works & Screens Carousel

  ```
  Files:
    src/components/marketing/HowItWorks.tsx (new)
    src/components/marketing/ScreensCarousel.tsx (new)
  Pattern: Numbered steps with alternating slide-in, auto-advance carousel
  Copy: TASK.md section 5 (3-step flow)
  Success: 3-step layout renders, carousel cycles Today/Analytics/History screenshots
  Test: Carousel pauses on hover, auto-advances every 6-8s
  Dependencies: Motion system
  Time: 2h
  ```

- [x] Create FAQ & Final CTA sections

  ```
  Files:
    src/components/marketing/FAQ.tsx (new)
    src/components/marketing/FinalCTA.tsx (new)
  Pattern: Radix Accordion for FAQ (or details/summary fallback)
  Copy: TASK.md section 5 (FAQ questions, final CTA)
  Success: 6-8 FAQ items expand/collapse, final CTA with large headline + button
  Test: FAQ toggles smooth, analytics events fire
  Dependencies: Motion system
  Time: 1.5h
  ```

- [x] Integrate all sections in marketing page
  ```
  Files: src/app/(marketing)/page.tsx
  Pattern: Replace UnauthenticatedLanding with section composition
  Architecture: Stack sections per TASK.md section 5 structure
  Success: Full page renders with all sections, smooth scroll, no layout shift
  Test: Lighthouse score >90, mobile responsive, no TypeScript errors
  Dependencies: All Phase 1 sections complete
  Time: 1h
  ```

## Phase 2: Polish & Analytics (4-5h)

- [x] Add analytics event tracking to marketing components

  ```
  Files:
    src/lib/analytics.ts (extend AnalyticsEventDefinitions)
    src/components/marketing/* (add trackEvent calls)
  Events: Marketing Page View, CTA Click, FAQ Toggle, Nav Link Click (per TASK.md section 10)
  Pattern: Follow existing trackEvent usage in dashboard/
  Success: All events fire correctly, visible in Vercel Analytics dashboard
  Test: Click CTAs/FAQ, verify events in browser network tab
  Time: 1.5h
  ```

- [x] Create device mock & integrate hero visual

  ```
  Files:
    public/images/device-mock-today.png (screenshot)
    src/components/marketing/Hero.tsx (update)
  Approach: Screenshot Today page at 375x812, use next/image with priority, floating animation
  Success: Hero shows device mock, LCP <2.5s, smooth floating loop
  Test: Image loads with priority flag, animation smooth 60fps
  Dependencies: Hero component exists
  Time: 2h
  ```

- [x] Build testimonials section
  ```
  Files: src/components/marketing/Testimonials.tsx (new)
  Pattern: 3-card grid or carousel with cross-fade transitions
  Copy: Placeholder quotes (seed 2-3 examples per TASK.md)
  Success: 3 testimonials render with avatars, smooth transitions
  Test: Carousel auto-advances if implemented, pause on hover
  Dependencies: Motion system
  Time: 1h
  ```

## Phase 3: SEO & Metadata (2-3h)

- [x] Implement Pricing/Pro waitlist section

  ```
  Files: src/components/marketing/Pricing.tsx (new)
  Pattern: Two-column card layout (Free vs Pro)
  Copy: TASK.md section 5 (pricing structure)
  Success: Free tier features listed, Pro shows "Join waitlist" CTA
  Test: Cards responsive, email capture works (if implemented)
  Time: 1.5h
  ```

- [x] Setup SEO & Open Graph metadata
  ```
  Files:
    src/app/sitemap.ts (new)
    src/app/robots.ts (new)
    src/app/opengraph-image.tsx (new)
  Pattern: Follow Next.js metadata conventions (app router)
  Success: sitemap.xml serves all routes, robots.txt allows crawling, OG image renders
  Test: Visit /sitemap.xml and /robots.txt, verify OG preview in Twitter/Slack
  Time: 1.5h
  ```

## Quality Gates (Run Before Each Phase Completion)

- [ ] TypeScript: `pnpm typecheck` passes
- [ ] Tests: `pnpm test --run` passes
- [ ] Build: `pnpm build` succeeds
- [ ] Lighthouse: Performance, SEO, Accessibility ≥90
- [ ] Responsive: Test at 375px (mobile), 768px (tablet), 1440px (desktop)
- [ ] Accessibility: Keyboard nav works, screen reader friendly
- [ ] Motion: Verify `prefers-reduced-motion` disables animations

## Success Criteria

✅ Marketing page loads <2s (LCP)
✅ All CTAs tracked in Vercel Analytics
✅ Copy matches TASK.md vision
✅ Mobile-first responsive design
✅ Lighthouse ≥90 (performance, SEO, accessibility)
✅ CLS <0.1 (no layout shift)
✅ WCAG AA compliant (color contrast, keyboard nav)

## Future Enhancements (Post-MVP)

- Replace static screenshot with 60-90s scrollytelling video
- Add real testimonials (replace placeholders)
- Implement Pro email waitlist backend
- A/B test hero headline variations
- Add blog/changelog routes
