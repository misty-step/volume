import type { LucideIcon } from "lucide-react";
import {
  ListChecks,
  ShieldCheck,
  Smartphone,
  Sparkles,
  TimerReset,
  TrendingUp,
} from "lucide-react";

export const NAV_LINKS = [
  { label: "Why Volume", href: "#why-volume" },
  { label: "Features", href: "#features" },
  { label: "How it Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
] as const;

export type NavLink = (typeof NAV_LINKS)[number];

export const FOOTER_LINK_GROUPS = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "#features" },
      { label: "How it Works", href: "#how-it-works" },
      { label: "Pricing", href: "#pricing" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Journal", href: "/#journal" },
      { label: "Changelog", href: "/#changelog" },
      { label: "Contact", href: "mailto:hello@volume.fitness" },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "X (Twitter)", href: "https://x.com/volume" },
      { label: "Privacy", href: "#privacy" },
      { label: "Terms", href: "#terms" },
    ],
  },
] as const;

export type FooterLinkGroup = (typeof FOOTER_LINK_GROUPS)[number];

export const HERO_STATS = [
  { label: "Workouts logged last month", value: "1.2K+" },
  { label: "Avg. setup time per set", value: "< 5 sec" },
  { label: "Lifters reporting clearer training decisions", value: "76%" },
] as const;

export type HeroStat = (typeof HERO_STATS)[number];

export interface BenefitDefinition {
  title: string;
  description: string;
  icon: LucideIcon;
}

export const BENEFITS: BenefitDefinition[] = [
  {
    title: "Faster than your rest timer",
    description:
      "Log sets with one tap, undo mistakes instantly, and keep momentum between sets.",
    icon: TimerReset,
  },
  {
    title: "Progress you can feel",
    description:
      "Heatmap, PR snapshots, and weekly deltas make trends obvious in seconds.",
    icon: TrendingUp,
  },
  {
    title: "AI that shuts up",
    description:
      "One short recap lands every week. No chat windows, no noise, just signal.",
    icon: Sparkles,
  },
  {
    title: "Data stays yours",
    description:
      "Private by default with effortless exports. Zero ads, zero weird sharing.",
    icon: ShieldCheck,
  },
  {
    title: "Built for real gyms",
    description:
      "Reps, weight, and duration in kg/lb with dark mode that respects tired eyes.",
    icon: Smartphone,
  },
];

export const SOCIAL_PROOF_AVATARS = [
  { initials: "TK", name: "Talia K.", role: "Strength coach" },
  { initials: "MJ", name: "Marco J.", role: "Powerlifter" },
  { initials: "AE", name: "Anika E.", role: "Product designer" },
  { initials: "RS", name: "Ravi S.", role: "High-volume trainer" },
] as const;

export const SOCIAL_PROOF_BRANDS = [
  "Lift Lab",
  "North Loop Strength",
  "Volume Collective",
  "Neighborhood Garage Gyms",
] as const;

export interface HowItWorksStep {
  title: string;
  description: string;
  detail: string;
}

export const HOW_IT_WORKS_STEPS: HowItWorksStep[] = [
  {
    title: "Start logging",
    description:
      "Pick an exercise or add one inline, then log a set in under five seconds.",
    detail:
      "Volume remembers your last load, rest timer, and unit preference so you stay present between sets.",
  },
  {
    title: "Train as usual",
    description:
      "Volume tracks every PR, streak, and intensity shift quietly in the background.",
    detail:
      "Heatmaps, progressive overload guards, and recovery cues stay synced across devices via Convex.",
  },
  {
    title: "Review weekly",
    description:
      "A short AI recap lands once a week to highlight trends you should actually care about.",
    detail:
      "Keep or dismiss nudges, export data anytime, and share the recap with your crew if you want feedback.",
  },
];

export interface ScreenCarouselSlide {
  title: string;
  description: string;
  statLabel: string;
  statValue: string;
  callout: string;
}

export const SCREEN_SLIDES: ScreenCarouselSlide[] = [
  {
    title: "Today view",
    description:
      "Inline exercise search, quick log form, undo, and streak card keep you moving.",
    statLabel: "Avg. log time",
    statValue: "4.8s",
    callout: "Tap once to repeat your last set, no templates required.",
  },
  {
    title: "Analytics",
    description:
      "Heatmaps, PR tiles, and progressive overload widgets highlight real progress.",
    statLabel: "Weekly volume",
    statValue: "+7%",
    callout: "Hover to see muscle group bias and recovery guidance.",
  },
  {
    title: "AI recap",
    description:
      "Coach-style summary with one primary win, one friction point, and next focus.",
    statLabel: "Report length",
    statValue: "90 sec",
    callout: "No chat window—just signal delivered every Sunday morning.",
  },
];
