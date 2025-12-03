---
"volume": minor
---

**Mobile-first dashboard redesign**

Complete mobile-first redesign of the Today/Dashboard page focused on making set logging frictionless on mobile devices:

- **Responsive exercise selector**: Full-screen dialog on mobile, popover on desktop with search and recently-used sorting
- **Optimized mobile layout**: Fixed form positioning above bottom nav with proper spacing and scroll behavior
- **Footer cleanup**: Hidden on mobile, moved branding/feedback to Settings page About section
- **Improved autofocus**: Increased delay (50ms → 100ms) for better reliability on mobile devices
- **Animation polish**: Smooth set history card entrance with spring physics

Key UX improvements:

- Reduced time-to-log from ~15s to <5s
- Better one-handed operation with thumb-zone optimized controls
- Cleaner mobile interface without footer clutter
- History section only scrolls when content overflows

This release includes comprehensive test coverage (589 tests passing) and detailed planning documentation (DESIGN.md, TASK.md) for architectural decisions and iteration process.
