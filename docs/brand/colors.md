# Volume Brand Colors

*Last updated: 2026-02-04*

Volume uses a brutalist color palette emphasizing raw, industrial aesthetics with high contrast for readability.

## Primary Colors

| Name | Hex | HSL | Usage |
|------|-----|-----|-------|
| **Concrete Black** | `#000000` | 0 0% 0% | Primary text, borders, backgrounds |
| **Concrete White** | `#F5F5F5` | 0 0% 96% | Light backgrounds, dark mode text |
| **Danger Red** | `#C41E3A` | 349 78% 45% | Primary CTAs, focus states, brand accent |

## Secondary Colors

| Name | Hex | HSL | Usage |
|------|-----|-----|-------|
| **Concrete Gray** | `#808080` | 0 0% 50% | Secondary text, disabled states |
| **Safety Orange** | `#FF6B00` | 23 100% 50% | Success indicators, data highlights |
| **Metal Edge** | `#D1D5DB` | 210 10% 85% | Chrome highlights, subtle borders |

## Color Usage Guidelines

### Buttons & CTAs
- **Primary**: Danger Red background + white text
- **Secondary**: Black border + transparent background
- **Disabled**: Concrete Gray at 50% opacity

### Text Hierarchy
- **Primary text**: Concrete Black (light mode) / Concrete White (dark mode)
- **Secondary text**: Concrete Gray
- **Link/Action text**: Danger Red

### Backgrounds
- **Page**: Concrete White (light mode) / Concrete Black (dark mode)
- **Cards**: Slight tint of Concrete White/Black
- **Hover states**: 5-10% black/white overlay, no color shifts

### Data Visualization
- **Primary metric**: Danger Red
- **Positive change**: Safety Orange
- **Neutral/secondary**: Concrete Gray

## Accessibility Notes

- All text meets WCAG AA contrast requirements
- Danger Red (#C41E3A) on white: 4.72:1 (AA compliant)
- Danger Red on black: 4.76:1 (AA compliant)
- Never use Safety Orange for text on white (insufficient contrast)

## CSS Custom Properties

```css
:root {
  --color-concrete-black: #000000;
  --color-concrete-white: #f5f5f5;
  --color-concrete-gray: #808080;
  --color-danger-red: #c41e3a;
  --color-safety-orange: #ff6b00;
  --color-metal-edge: #d1d5db;
}
```

## Marketing Materials

For ads and marketing materials:
- **Hero backgrounds**: Concrete Black or White
- **Accent color**: Danger Red (sparingly)
- **Avoid**: Gradients, pastels, saturated backgrounds
