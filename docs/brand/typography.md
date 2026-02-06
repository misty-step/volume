# Volume Brand Typography

*Last updated: 2026-02-04*

Volume's typography reflects brutalist design principles: bold, industrial, and highly functional.

## Font Families

| Category | Font Stack | Usage |
|----------|-----------|-------|
| **Display** | Bebas Neue, Arial Black, sans-serif | Hero text, headlines, buttons |
| **Heading** | Inter Tight, Arial Narrow, sans-serif | Section headings, labels |
| **Mono** | JetBrains Mono, Courier New, monospace | Numbers, data, timestamps |
| **Body** | system-ui, -apple-system, sans-serif | Body text, descriptions |

## Type Scale

| Level | Size | Usage |
|-------|------|-------|
| **Hero** | clamp(3rem, 12vw, 8rem) | Marketing hero headlines |
| **Display** | clamp(2rem, 6vw, 4rem) | Large section headings |
| **H1** | 2.5rem (40px) | Page titles |
| **H2** | 2rem (32px) | Section headings |
| **H3** | 1.5rem (24px) | Subsections |
| **Body** | 1rem (16px) | Paragraph text |
| **Small** | 0.875rem (14px) | Captions, fine print |

## Typography Rules

### Uppercase Treatment
- All buttons use UPPERCASE
- Labels and section headers use UPPERCASE
- Navigation items use UPPERCASE

### Letter Spacing
- Uppercase text: `tracking-wider` (0.05em-0.1em)
- Body text: Normal tracking

### Monospace for Data
- **Always use mono font for:**
  - Rep counts
  - Weight numbers
  - Duration/time
  - Timestamps
  - Statistics

### Line Heights
- Headings: 1.1-1.2
- Body text: 1.5-1.6
- Data/mono: 1.4

## Example Usage

```tsx
// Hero headline
<h1 className="font-display text-hero uppercase tracking-wider">
  TRACK YOUR LIFTS
</h1>

// Section heading
<h2 className="font-heading text-h2 uppercase">
  WORKOUT HISTORY
</h2>

// Data display
<span className="font-mono text-body">
  225 LBS × 8 REPS
</span>

// Body text
<p className="font-body text-body">
  Volume helps you track workouts in seconds, not minutes.
</p>
```

## Marketing Materials

### Headlines
- Font: Bebas Neue
- Style: UPPERCASE, tight tracking
- Examples:
  - "TRACK WORKOUTS IN SECONDS"
  - "NO FLUFF. JUST LIFTS."
  - "BRUTALLY SIMPLE FITNESS"

### Taglines
- Font: Inter Tight
- Style: UPPERCASE or Title Case
- Keep under 10 words

### Body Copy
- Font: System font stack
- Style: Sentence case
- Short, punchy sentences
- Avoid jargon

## Font Loading

```css
/* Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter+Tight:wght@400;600&family=JetBrains+Mono:wght@400;600&display=swap');
```

## Accessibility

- Minimum body text size: 16px
- Minimum touch target text: 14px
- Maintain 4.5:1 contrast ratio for body text
- Maintain 3:1 contrast ratio for large text (18px+)
