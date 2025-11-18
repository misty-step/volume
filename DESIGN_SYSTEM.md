# Volume Brutalist Design System

Last updated: 2025-11-17

## Overview

Volume uses a brutalist design language emphasizing raw materials, industrial aesthetics, and functional clarity. Every element follows principles of honesty, weight, and mechanical precision.

## Color Palette

### Core Colors

- **Concrete Black**: `#000000` (0 0% 0%) - Primary text, borders
- **Concrete White**: `#F5F5F5` (0 0% 96%) - Backgrounds, light text
- **Concrete Gray**: `#808080` (0 0% 50%) - Secondary elements

### Accent Colors

- **Danger Red**: `#C41E3A` (349 78% 45%) - Primary actions, focus states
- **Safety Orange**: `#FF6B00` (23 100% 50%) - Accents, success indicators, highlights
- **Metal Edge**: `#D1D5DB` (210 10% 85%) - Chrome highlights

### Usage Guidelines

- **Primary actions**: Danger Red background + white text
- **Accents & highlights**: Safety Orange for data emphasis, success states
- **Borders**: Always black (light mode) or white (dark mode), 3px thick
- **Hover states**: 5-10% concrete-black/white overlay, no color shifts

## Typography

### Font Families

```typescript
display: ("Bebas Neue", "Arial Black", sans - serif); // Hero text, buttons
heading: ("Inter Tight", "Arial Narrow", sans - serif); // Headings
mono: ("JetBrains Mono", "Courier New", monospace); // Numbers, code, data
body: (system - ui, -apple - system, sans - serif); // Body text
```

### Type Scale

- **Hero**: `clamp(3rem, 12vw, 8rem)` - Marketing hero
- **Display**: `clamp(2rem, 6vw, 4rem)` - Large headings
- **H1**: `2.5rem` (40px)
- **H2**: `2rem` (32px)
- **H3**: `1.5rem` (24px)
- **Body**: `1rem` (16px)
- **Small**: `0.875rem` (14px)

### Conventions

- **Uppercase**: All buttons, labels, section headers
- **Letter spacing**: `tracking-wider` (0.05em-0.1em) for uppercase
- **Mono**: All numeric data (reps, weight, duration, timestamps)

## Spacing & Layout

### Grid System

- **Base unit**: 8px
- **Gutter**: 24px (component spacing)
- **Section**: 64px (major layout sections)

### Touch Targets

- **Minimum height**: 44px (iOS HIG, WCAG 2.5.5)
- **Comfortable height**: 48px (primary CTAs)
- **Button padding**: 12-16px horizontal

## Borders & Corners

### Border Widths

- **Thin**: 1px - Subtle separators
- **Normal**: 2px - Standard UI elements
- **Thick**: 3px - Primary containers, dialogs
- **Heavy**: 4px - Emphasis, hero sections

### Border Radius

- **None**: 0px (default brutalist)
- **Minimal**: 2px (acceptable for small elements)
- **Maximum**: 4px (rare, only for specific UI needs)

**Rule**: Prefer sharp corners. Rounded corners only when absolutely necessary for UX.

## Shadows & Depth

```typescript
none: "none"; // Flat elements
press: "inset 0 4px 8px rgba(0,0,0,0.3)"; // Active button state
lift: "4px 4px 0 0 rgba(0,0,0,1)"; // Elevated cards
heavy: "8px 8px 0 0 rgba(0,0,0,0.3)"; // Dialogs, modals
dialog: "8px 8px 0 0 rgba(0,0,0,0.3)"; // Same as heavy
```

**Principle**: Use offset shadows (no blur) for depth. Shadows always cast at 45° angle (equal x/y offset).

## Focus & Interactive States

### Focus Rings

```css
ring-3 ring-danger-red ring-offset-0  /* Primary focus */
```

### Hover States

```css
/* Light mode */
hover:bg-concrete-black/5      /* Subtle */
hover:bg-concrete-black/10     /* Medium */

/* Dark mode */
dark:hover:bg-concrete-white/5
dark:hover:bg-concrete-white/10
```

### Active States

```css
active:scale-95                               /* Button press */
active:shadow-inner                           /* Visual depth */
active:shadow-[inset_0_4px_8px_rgba(0,0,0,0.3)]  /* Explicit inset */
```

### Transition

```css
transition-all duration-75  /* Fast, mechanical snaps */
```

## Components

### BrutalistButton

- **Variants**: `danger`, `accent`, `outline`, `ghost`
- **Sizes**: `sm`, `default`, `lg`, `icon`
- **Style**: Uppercase, thick border (3px), font-display
- **Hover**: Opacity reduction, no color shift
- **Active**: Scale down + inset shadow

### BrutalistCard

- **Variants**: `default`, `danger`, `accent`
- **Border**: 3px solid, colored by variant
- **Animation**: Fade-in-up on mount
- **Optional**: Concrete texture overlay

### BrutalistProgress

- **Variants**: `default`, `danger`, `accent`
- **Modes**: Solid or segmented (10 bars)
- **Style**: 3px border, sharp corners
- **Animation**: Concrete-fill (smooth width transition)

### Input

- **Border**: 2px solid
- **Focus**: 3px red ring, no offset
- **Numbers**: Auto font-mono + tabular-nums
- **Placeholder**: 60% opacity muted text

### Badge

- **Style**: Uppercase mono, 2px border
- **Variants**: `default`, `secondary`, `destructive`, `outline`
- **Usage**: Muscle groups, tags, status indicators

### Dialog/AlertDialog

- **Border**: 3px solid
- **Shadow**: 8px offset heavy shadow
- **Corners**: Sharp (no rounding)
- **Title**: Uppercase mono, bold

### Settings Components

- **Section**: 3px border container, uppercase mono headers
- **List Items**: 2px border separators, uppercase titles
- **Hover**: 5% concrete overlay, inner shadow on active

## Animations

### Motion Variants

```typescript
// Weight drop - element falls into place
weightDrop: {
  initial: { y: -20, opacity: 0 },
  animate: { y: 0, opacity: 1, duration: 0.4, ease: [0.9, 0.1, 0.3, 0.9] }
}

// Mechanical slide - sharp horizontal entry
mechanicalSlide: {
  initial: { x: -100, opacity: 0 },
  animate: { x: 0, opacity: 1, duration: 0.3, ease: [0.4, 0.0, 0.2, 1] }
}

// Button press - click interaction
buttonPress: {
  tap: { scale: 0.95, duration: 0.075 }
}

// Exercise list - staggered entries
exerciseListStagger: {
  animate: { staggerChildren: 0.05, delayChildren: 0.1 }
}
```

### Easing Functions

- **Mechanical**: `[0.4, 0.0, 0.2, 1]` - Sharp, industrial
- **Weight drop**: `[0.9, 0.1, 0.3, 0.9]` - Heavy impact
- **Explosive**: `[0.2, 1, 0.3, 1]` - Celebration burst

### Principles

- **Fast transitions**: 75-200ms for interactions
- **Sharp easing**: No bouncy or elastic curves
- **Mechanical feel**: Precise, robotic timing
- **Functional motion**: Animation serves purpose, not decoration

## Accessibility

### WCAG Compliance

- **Color contrast**: All text meets AA standards (4.5:1 minimum)
- **Touch targets**: Minimum 44px height (iOS HIG)
- **Focus indicators**: 3px red rings, high contrast
- **Motion**: Respect `prefers-reduced-motion` (disable all animations)

### Keyboard Navigation

- Tab order follows visual hierarchy
- All interactive elements focusable
- Clear focus indicators (red ring)
- Enter/Space activate buttons

## Usage Examples

### Creating a Button

```tsx
import { BrutalistButton } from "@/components/brutalist";

<BrutalistButton variant="danger" size="lg">
  LOG SET
</BrutalistButton>;
```

### Using Motion

```tsx
import { motion } from "framer-motion";
import { brutalistMotion } from "@/lib/brutalist-motion";

<motion.div variants={brutalistMotion.weightDrop}>Content</motion.div>;
```

### Applying Focus State

```tsx
import { BRUTALIST_FOCUS } from "@/config/design-tokens";

<button className={BRUTALIST_FOCUS.ring}>Focus me</button>;
```

## Design Tokens Location

- **Colors**: `src/config/design-tokens.ts` → `BRUTALIST_COLORS`
- **Typography**: `src/config/design-tokens.ts` → `BRUTALIST_TYPOGRAPHY`
- **Spacing**: `src/config/design-tokens.ts` → `BRUTALIST_SPACING`
- **Motion**: `src/config/design-tokens.ts` → `BRUTALIST_MOTION`
- **Borders**: `src/config/design-tokens.ts` → `BRUTALIST_BORDERS`
- **Shadows**: `src/config/design-tokens.ts` → `BRUTALIST_SHADOWS`
- **Focus**: `src/config/design-tokens.ts` → `BRUTALIST_FOCUS`
- **Interactive**: `src/config/design-tokens.ts` → `BRUTALIST_INTERACTIVE`

## Do's and Don'ts

### ✅ Do

- Use thick borders (3px)
- Keep corners sharp
- Apply uppercase to labels/buttons
- Use mono font for numbers
- Maintain 44px minimum touch targets
- Apply safety orange for data highlights
- Use mechanical easing for animations
- Respect reduced motion preferences

### ❌ Don't

- Use rounded corners (except minimal 2-4px when necessary)
- Use gradient backgrounds
- Mix font weights within same context
- Use soft shadows (always offset, no blur)
- Animate decoratively (motion must serve purpose)
- Use accent colors for large backgrounds
- Ignore touch target sizes on mobile
- Override brutalist components with generic shadcn styles

## Migration Checklist

When creating new features:

- [ ] Use `BrutalistButton` instead of `Button` for primary actions
- [ ] Use `BrutalistCard` for containers
- [ ] Apply `border-3` for thick borders
- [ ] Use `font-mono` for numeric data
- [ ] Add `uppercase tracking-wider` to labels
- [ ] Use safety orange for highlights (not neon green)
- [ ] Ensure 44px minimum touch target height
- [ ] Add appropriate motion variants from `brutalistMotion`
- [ ] Test with `prefers-reduced-motion` enabled

## References

- Design tokens: `src/config/design-tokens.ts`
- Motion variants: `src/lib/brutalist-motion.ts`
- Brutalist components: `src/components/brutalist/`
- Global styles: `src/app/globals.css`
- Tailwind config: `tailwind.config.ts`
