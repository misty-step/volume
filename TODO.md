# TODO: Aesthetic Elevation - Precision Instrument

**Objective**: Transform Volume from "industrial-themed" to "precision instrument" through systematic brutalist design application.

**Strategic Context**: Volume has world-class design foundations (tokens, motion system, typography scale). Phase 1 completed SetCard/analytics brutalist conversion and number typography centralization. **Current bottleneck**: Base UI primitives (button, popover, dropdown, select) still use generic shadcn/ui styling with rounded corners. This is why the unauthenticated homepage looks identical - these foundational components haven't been brutalist-ified yet.

**Success Criteria**: Zero rounded-lg/gray-\* in ALL components, universal design token usage, sharp corners everywhere, 3px borders throughout.

---

## ✅ Phase 1: Quick Wins (COMPLETED - 4h)

### 1.1 SetCard Brutalist Conversion ✅

- [x] Replace SetCard container styling with brutalist classes
- [x] Convert exercise name to display font with uppercase styling
- [x] Transform weight/reps display with monospace + danger-red
- [x] Update timestamp to monospace uppercase
- [x] Convert repeat button from blue to danger-red, remove rounded
- [x] Convert delete button to sharp styling with border emphasis

### 1.2 Analytics Widget Sharpening ✅

- [x] All analytics widgets already using BrutalistCard
- [x] Progressive overload chart already has rounded-none override
- [x] Tooltip styling already brutalist-ified

### 1.3 Number Typography Hero Moment ✅

- [x] Created typography-utils.ts with numberDisplayClasses
- [x] Applied to SetCard weight display
- [x] Applied to QuickLogForm focused inputs
- [x] Applied to GroupedSetHistory totals
- [x] Applied to analytics stat cards

### 1.4 Analytics Widget Color Fixes ✅

- [x] All analytics cards already using BrutalistCard
- [x] All using numberDisplayClasses for metrics
- [x] Consistent typography across analytics page

### 1.5 Duration Formatting Utility ✅

- [x] Created formatDuration in date-utils.ts (deep module, Ousterhout-compliant)
- [x] Removed duplicate from SetCard
- [x] Removed duplicate from exercise-set-group.tsx
- [x] Removed duplicate from quick-log-form.tsx
- [x] Removed duplicate from chronological-set-history.tsx

---

## ✅ Phase 3.1: Base UI Component Conversion (COMPLETED - Dramatic Transformation)

**Context**: This is the REAL transformation. Base UI components are still generic shadcn/ui with rounded corners. Converting these creates the dramatic visual shift across the entire app.

### Base UI Primitives (Critical Path)

- [x] **src/components/ui/button.tsx**
  - Remove: `rounded-md` from all size variants (sm, lg)
  - Add: Sharp corners (0px radius)
  - Add: 3px borders for outline variant
  - Add: Hard shadows for emphasis variants
  - Success: All buttons sharp-cornered, using design token colors

- [x] **src/components/ui/popover.tsx**
  - Remove: `rounded-md` from PopoverContent
  - Change border to 3px: `border-3`
  - Update shadow to brutalist hard shadow
  - Success: Dropdown menus/popovers have sharp corners + 3px borders

- [x] **src/components/ui/command.tsx**
  - Remove: `rounded-md` from Command container
  - Remove: `rounded-md` from CommandInput
  - Add: 3px borders where appropriate
  - Success: Command palette (exercise selector) has sharp styling

- [x] **src/components/ui/dropdown-menu.tsx**
  - Remove: `rounded-md` from DropdownMenuContent
  - Remove: `rounded-md` from DropdownMenuSubContent
  - Change to 3px borders
  - Update shadow to brutalist
  - Success: User menu dropdown has sharp corners

- [x] **src/components/ui/select.tsx**
  - Remove: `rounded-md` from SelectTrigger
  - Remove: `rounded-md` from SelectContent
  - Change to 3px borders, sharp corners
  - Update focus states to 3px danger-red ring
  - Success: Select dropdowns match brutalist aesthetic

- [x] **src/components/ui/skeleton.tsx**
  - Remove: `rounded-md` class
  - Update to sharp corners (0px radius)
  - Keep subtle animation, adjust colors to design tokens
  - Success: Loading skeletons have sharp rectangular styling

### Dashboard Components

- [x] **src/components/dashboard/inline-exercise-creator.tsx**
  - Remove: `rounded-md` from container (line 10)
  - Change `border` to `border-3`
  - Update `bg-muted/80` to use design tokens
  - Success: Exercise creator card has sharp brutalist styling

- [x] **src/components/dashboard/first-run-experience.tsx**
  - Remove: ALL `rounded-md` classes (lines 11, 13, 14, 15)
  - Convert input to BrutalistInput component
  - Convert buttons to BrutalistButton component
  - Change borders to 3px throughout
  - Success: Onboarding flow matches brutalist aesthetic

### Color Token Audit

- [~] **Search and replace gray-\* colors**
  - Run: `grep -r "gray-[0-9]" src/components --include="*.tsx"`
  - Replace gray-200/300/400 with `concrete-gray` or `muted`
  - Replace gray-500/600/700 with `muted-foreground`
  - Replace gray-800/900 with `foreground`
  - Success: Zero hardcoded gray-\* colors, all use design tokens

- [ ] **Search and replace blue-\* colors**
  - Run: `grep -r "blue-[0-9]" src/components --include="*.tsx"`
  - Replace blue-\* with `danger-red` for primary actions
  - Replace blue-\* with `primary` for links
  - Success: Zero blue colors (not brutalist), all use danger-red/primary tokens

---

## 📋 Phase 2: Precision Refinements (NEXT - 6h)

### 2.1 Golden Ratio Motion System

- [ ] Add PRECISION_TIMING to brutalist-motion.ts
- [ ] Update animation durations to golden ratio (0.618s)
- [ ] Apply to SetCard entrance animations
- [ ] Apply to form field focus transitions

### 2.2 Chrome Accent System

- [ ] Add chromeHighlight/chromeShadow to design-tokens.ts
- [ ] Apply chrome accents to input focus states
- [ ] Apply chrome to button pressed states
- [ ] Apply subtle chrome glow to card hover states

### 2.3 Micro-Interaction Polish

- [ ] Add tap scale to BrutalistButton (0.97 on press)
- [ ] Add border glow on input focus (chrome accent)
- [ ] Add 360° rotate to SetCard repeat button on click
- [ ] Add shake animation to delete confirmation on cancel

### 2.4 Focus Ring Enhancement

- [ ] Strengthen focus system in globals.css
- [ ] Add 2px ring-offset for clarity
- [ ] Thicker rings for number inputs (4px)
- [ ] Test keyboard navigation flow

---

## 🎯 Phase 3.2-3.3: Systematic Consistency (LATER - 8h)

### Typography Scale Refinement

- [ ] Expand BRUTALIST_TYPOGRAPHY with stat/metric/label sizes
- [ ] Add type pairings for specific contexts
- [ ] Document when to use each size

### Motion Vocabulary Enforcement

- [ ] Create motionPresets for common patterns
- [ ] cardEntrance preset
- [ ] listStagger preset
- [ ] numberReveal preset

---

## 🧪 Testing & Verification

### Visual Regression Testing

- [ ] Test SetCard in all states (default, hover, focus, loading)
- [ ] Test analytics page with real data in light/dark modes
- [ ] Test responsive breakpoints (mobile, tablet, desktop)
- [ ] Screenshot before/after comparison

### Accessibility Audit

- [ ] Tab through all interactive elements
- [ ] Verify 3px danger-red focus rings everywhere
- [ ] Test with screen reader (VoiceOver/NVDA)
- [ ] Run axe DevTools accessibility audit
- [ ] Verify WCAG AA compliance maintained

### Cross-Browser Testing

- [ ] Test in Chrome, Safari, Firefox
- [ ] Verify tabular-nums font support
- [ ] Verify CSS custom properties work
- [ ] Verify Tailwind arbitrary values work

---

## 📊 Progress Summary

**Phase 1**: ✅ 100% Complete (SetCard, analytics, typography centralization)
**Phase 3.1**: ✅ 100% Complete (Base UI conversion - ALL COMPONENTS BRUTALIST)
**Phase 2**: 📋 0% Complete (Motion refinements)
**Phase 3.2-3.3**: 📋 0% Complete (Systematic consistency)

**Next Action**: Phase 2 motion refinements (golden ratio timing, chrome accents, micro-interactions) OR color token audit to eliminate remaining gray-_/blue-_ colors.
