Below is a full discovery → vision → concrete plan for **Volume’s** marketing surface and (lightly) the in‑app aesthetic. I read through the codebase so the plan assumes your current stack and files:

- **Tech & structure:** Next.js app router, Tailwind + shadcn/radix, Clerk auth, Convex backend, Vercel analytics.
  Marketing lives at `src/app/(marketing)/page.tsx` and currently renders `UnauthenticatedLanding` (two‑column headline + Clerk SignUp). Icons/OG icons are generated in `src/app/icon.tsx` & `apple-icon.tsx`. Global tokens are in `src/app/globals.css`. There’s no Framer Motion yet.
- **Core product today:** super fast set logging (“Today” dashboard), simple history, analytics widgets (heatmap, progressive overload, AI report card), weight‑unit setting, and AI weekly reports (Convex jobs). Main app pages: `/today`, `/analytics`, `/history`, `/settings`.

---

## 1) Product & brand “grok”: what Volume _is_ right now

**What feels uniquely strong already**

- **Speed to first set**: quick log form, inline exercise creator, undo toast, sane empty states for first‑run.
- **Data that matters**: volume, streaks, PR snapshots, GitHub‑style heatmap, and scheduled **AI insights**.
- **No bloat**: the app flows are focused; the UI is functional, readable, and responsive.

**What’s missing in the marketing story**

- **Positioning**: _why_ another tracker? (Speed + clarity + automatic insights.)
- **Proof & outcomes**: show benefits (consistency, progressive overload, confidence in programming), not just features.
- **Professional polish**: editorial hierarchy, tasteful motion, hero device mock/screencast, social proof, and a fuller page structure (pricing/FAQ/how‑it‑works).
- **Conversion friction**: the hero goes straight to Clerk SignUp; we should lead with value and offer a secondary “See how it works” path.

---

## 2) Ultimate vision for the marketing surface

> **Volume** — _Track every set in seconds. See real progress with clarity. Get lightweight AI insights that actually help you train better._

**Key messaging pillars**

1. **Fastest logging in class** – built for the moment between sets (no templates required to start; add structure later).
2. **Clarity over noise** – progress heatmaps, simple PRs, and weekly AI recaps that read like a coach’s notes.
3. **Consistency engine** – streaks, gentle nudges, and _useful_ reminders, not dopamine loops.
4. **Own your data** – straightforward exports, no ads, privacy‑by‑design.
5. **Made for real gyms** – offline‑friendly logging roadmap; works one‑handed; dark mode that respects your eyes.

**Brand personality**

- **Tone:** Calm, confident, precise. “We help you train like a pro without acting like one.”
- **Visual feel:** Modern editorial meets performance lab: clean type, generous negative space, subtle depth (glass & glow), one energetic accent (electric blue) used sparingly.

---

## 3) Immediate roadmap (practical, shippable)

**Week 1 – IA + structure + copy**

- Replace `UnauthenticatedLanding` with modular sections under `src/components/marketing/*` (see section 6).
- Draft hero & benefit copy (examples below).
- Add _device mock/screencast_ of Today + Analytics (static fallback for now).
- Add “How it works” (3 steps), Benefits grid, FAQ, Footer trust.
- Wire sticky nav with Primary CTA (**Get Started — free**), Secondary CTA (**See how it works**).

**Week 2 – Motion & polish**

- Add **Framer Motion** primitives (with `prefers-reduced-motion` support).
- Section reveals, counting stats, parallax hero background, gentle button micro‑interactions.
- Add simple **testimonial carousel** (seed with 2–3 quotes, can be placeholders until real copy).
- Implement proper **OG image** for share (via `next/og`) and add `sitemap.ts`/`robots.ts`.

**Week 3 – Proof & social**

- Publish a “What we believe about training” journal post and a “Feature deep‑dive: Progressive Overload” post.
- Add **email capture** for “Pro features” roadmap if you don’t want to launch pricing yet.
- Light **A/B** on hero headline and CTA phrasing (Vercel Analytics events).

---

## 4) Three distinct aesthetic directions (with trade‑offs)

### A) **Calm Focus** (inspired by Altair/Odyssey)

- **Look:** dusky gradient sky, soft grain, concentric rings behind hero device; glass card overlays; serif display for hero + Inter for body.
- **Pros:** Emotional, memorable, speaks to clarity & calm; resonates with “mind between sets.”
- **Cons:** Requires strong art direction (images/video), risk of feeling “wellness” vs “performance” if overdone.

### B) **Performance Lab** (Palantir-esque)

- **Look:** monochrome base, crisp grids, outlines, thin rules, single accent (electric blue). Device mock floats with a soft glow line; charts look “instrumental.”
- **Pros:** Professional, serious, trustworthy; makes data/AI feel rigorous.
- **Cons:** Can feel cold; needs human elements (testimonials/avatars) to avoid sterility.

### C) **Glass & Glow** (Modern SaaS)

- **Look:** white or charcoal canvas, frosted glass panels, soft drop shadows, subtle gradients, animated dotted textures (like Launch/Quartr), playful micro‑motion.
- **Pros:** Familiar high‑conversion vibe; easy to execute; pairs well with screenshot‑as‑hero.
- **Cons:** Less distinctive; easy to slip into “SaaS generic” without strong typography.

> **Recommendation:** Ship **B with hints of A** — start with _Performance Lab_ for credibility and speed, then layer a calm ambient hero (A) once you have a good screencast or loop.

---

## 5) Page structure & sample copy (ready to implement)

**Sticky Navbar**

- Left: Logo mark (three bars) + _Volume_.
- Right: Why Volume, Features, How it Works, Pricing*, FAQ, **Get Started** (primary), **See Demo** (secondary ghost).
  *(If pricing isn’t ready, “Pricing” → “Pro (coming soon)”.)

**Hero (above the fold)**

- **Headline options:**
  1. _Where progress finds clarity._
  2. _Track every set. See the trend._
  3. _Fast logging. Honest insights._

- **Subhead:** _A workout tracker built for the seconds between sets. Log fast, stay consistent, and get weekly AI notes that actually help you train better._
- **CTAs:** **Get Started — free** (primary), **See how it works** (secondary anchor → explainer)
- **Right visual:** Device mock with short looping screencast (Today → log → heatmap → AI card).
- **Side stats (animated counters):** “76% report clearer training decisions”, “1.2K+ workouts logged last month” (use real or “—” until you have it).

**Trusted by strip (optional)**

- “Loved by independent lifters and small teams” + small avatars or badges.

**Benefits grid (4–6 cards)**

- _Log faster than you rest._ (Quick log, inline exercise creation, undo)
- _See patterns, not noise._ (Heatmap, high‑signal analytics, PR snapshots)
- _An AI nudge that respects your time._ (Weekly recap; no chatbots)
- _Your data, your rules._ (Export; no ads; simple privacy)
- _Works the way you train._ (Reps/weight/duration; kg/lb; dark mode; mobile first)

**How it works (3 simple steps)**

1. **Start logging** — pick an exercise or add one inline.
2. **Train as usual** — Volume keeps your sets, PRs, and streaks in the background.
3. **Review weekly** — a short AI summary tells you what actually changed.

**Live preview / app screenshots**

- Carousel of screens: Today, Analytics, AI Report, History. (Each with a one‑line caption.)

**Pricing (or Pro waitlist)**

- **Free** — unlimited exercises, logging, heatmap, PRs.
- **Pro (coming soon)** — advanced analytics, custom templates, priority AI reports, data export automations.
- CTA: _Join Pro waitlist_ → email capture.

**Testimonials**

- 3 short quotes with small avatars; one long case study later.

**FAQ**

- “How is this different from Strong/Heavyset?”
- “Do I need templates to start?”
- “Will it work offline?” _(Roadmap note: queued logging coming.)_
- “How do AI reports work? Can I turn them off?”
- “Do you sell my data?” _(No.)_

**Final CTA section**

- Big, simple: _Train with clarity. Get started free._

**Footer**

- Links: Changelog/Journal, Privacy, Terms, Contact, X link.
- Add minimal site map + newsletter.

---

## 6) Component architecture & file plan

```
src/components/marketing/
  Navbar.tsx
  Hero.tsx
  SocialProof.tsx
  Benefits.tsx
  HowItWorks.tsx
  ScreensCarousel.tsx
  Pricing.tsx
  Testimonials.tsx
  FAQ.tsx
  FinalCTA.tsx
  Footer.tsx
  Motion.ts           // centralize Framer variants & durations

src/app/(marketing)/page.tsx
src/app/(marketing)/layout.tsx  // keep the signed-in redirect
```

**Motion system (Framer Motion)**

- `Motion.ts` exports `fadeInUp`, `staggerContainer`, `slideIn`, `scaleIn`, and a `reducedMotion` guard.
- Defaults: duration `0.5–0.7s`, easing `[0.21, 0.47, 0.32, 0.98]`, stagger `0.06–0.12s`.
- Respect `prefers-reduced-motion`: no parallax, turn counters into static numbers.

**Accessibility & perf**

- Semantic headings (one `h1` in hero, `h2` per section).
- `next/image` with `priority` for hero mock, `loading="lazy"` elsewhere.
- `next/font` already in place (Inter). If we add a display face, use a Google Font with `display=swap`; e.g., `Fraunces` or `Playfair Display` for H1 only.

---

## 7) Visual language (“design tokens”)

You already have HSL tokens. Let’s codify a brand‑leaning palette:

- **Primary:** Electric Blue `--primary: 210 100% 50%` (already set).
- **Accent (success/progress):** `--success: 142 76% 42%`.
- **Ambient gradient (hero):** from `hsl(222 84% 6%)` → `hsl(210 60% 12%)` (dark) or very light gray in light mode.
- **Radius:** md 10–12px, lg 16px for marketing cards.
- **Shadow:** subtle 2‑layer shadow for glass cards; remove heavy elevation elsewhere.
- **Type scale:** keep Inter for body; add a display style for hero only (Fraunces/Playfair or Space Grotesk if you want fully sans).

---

## 8) Copy you can use today (edit freely)

**Hero**

- **H1:** _Track every set. See the trend._
- **Sub:** _A workout tracker built for the seconds between sets. Log fast, stay consistent, and get weekly AI notes that actually help you train better._
- **CTA:** _Get Started — free_
- **Secondary:** _See how it works_

**Benefits (sample one‑liners)**

- _Faster than your rest timer_ — add sets with one tap, undo mistakes instantly.
- _Progress you can feel_ — PR snapshots and a heatmap that tells the real story.
- _AI that shuts up_ — one short weekly recap; no chat windows, no noise.
- _Data stays yours_ — export anytime; no ads; private by default.

**FAQ snippets**

- _Offline?_ Queued logging is on our roadmap; current version requires connectivity to sync.
- _Templates?_ Optional. You can start logging immediately and layer structure later.
- _Why Volume?_ Because training gets better when you remove friction and amplify clarity.

---

## 9) Motion ideas mapped to sections (tasteful, minimal)

- **Hero:** soft parallax on gradient background; device mock “floats” (2–4px translateY loop at 6–8s).
- **Stats:** odometer/count‑up on scroll into view.
- **Benefits grid:** staggered fadeInUp; subtle tilt/scale on hover.
- **How it works:** 1‑2‑3 panels slide in from alternating sides.
- **Testimonials:** cross‑fade carousel with 6–8s auto‑advance; pause on hover.
- **Final CTA:** background radial gradient scales in when section enters viewport.

---

## 10) Analytics & conversion instrumentation (Vercel Analytics)

Track:

- `marketing_view` (page view), `cta_click` (`{placement: 'hero'|'final'}`), `demo_play`, `nav_click`, `faq_toggle`, `pricing_view`.
- Create a simple funnel dashboard (even local) until you add PostHog/Mixpanel.

---

## 11) SEO & share

- Add `src/app/sitemap.ts` and `robots.ts`.
- Add `src/app/opengraph-image.tsx` to render a clean card with the three‑bar mark, headline, and subtle gradient.
- Meta: product keywords you already use + “progressive overload”, “AI workout insights”, “workout heatmap”.

---

## 12) App‑level aesthetic quick wins

- **Charts:** simplify to 1–2 stroke weights; align to monochrome + single accent; reduce gridline noise.
- **Cards:** unify radius/elevation across dashboard.
- **Empty states:** keep the great copy you have, but add a single illustration glyph (Lucide + soft background badge) for warmth.
- **Bottom nav (mobile):** increase touch targets, add active underline (2px) instead of color only.
- **AI Insights card:** switch model tag to a subtle pill; ensure markdown spacing and readable line‑length.

---

## 13) Execution checklist (very concrete)

**Implement**

1. Create `src/components/marketing/*` files listed above.
2. Install Framer Motion and add `Motion.ts` utility with base variants & reduced‑motion guard.
3. Build Hero with device mock (Image for now; drop in a MP4/WebM loop later).
4. Fill Benefits/How/FAQ sections with today’s copy.
5. Add sticky Navbar and Footer; wire anchor links.
6. Add Vercel Analytics event hooks for CTA, demo, and FAQ toggles.
7. Add `sitemap.ts`, `robots.ts`, and `opengraph-image.tsx`.
8. Ship behind a feature flag or directly (marketing is isolated); verify lighthouse (aim ≥95 perf/SEO).

**Polish next**

- Replace static screenshot with a **60–90s “scrollytelling”** clip (silent) showing: add set → undo → heatmap → AI recap.
- Add 2–3 real testimonials.
- If you want early monetization: add a **Pro** card with “coming soon” and email capture.

---

## 14) Optional: concise section wireframes

```
[ Sticky Nav ]  Logo | Why Volume | Features | How | Pricing | FAQ [ Get Started ]

[ Hero ]
| H1 + Sub + CTAs |  Device mock (loop)  |
| 3 small proof stats down the side |

[ Social Proof Strip ]

[ Benefits Grid ]  2 rows of 3 cards, icon + short body

[ How It Works ]   Step 1 | Step 2 | Step 3   (with tiny loops or static frames)

[ Screens Carousel ] (Today, Analytics, AI Insights, History)

[ Pricing / Pro Waitlist ]  Free | Pro (coming soon)

[ Testimonials ]  3 cards

[ FAQ ]  6–8 items

[ Final CTA ]  Big headline + single button

[ Footer ]  links + tiny logo
```

---

### Closing thought

You have a strong core: a _fast_ logger with _high‑signal_ analytics and genuinely useful **AI summaries**. The marketing page should make that value obvious within 5 seconds, feel serious enough for disciplined lifters, and convert with minimal friction. The plan above gets you there incrementally (two weeks to strong polish), while leaving room to evolve the brand toward a memorable “calm focus” hero as assets mature.

If you want, I can turn this into a skeleton PR with section components, Framer Motion variants, and drop‑in placeholder copy so you can iterate visually right away.
