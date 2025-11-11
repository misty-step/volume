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
