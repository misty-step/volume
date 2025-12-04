# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Mobile-first dashboard redesign**: Complete mobile-first redesign of the Today/Dashboard page focused on making set logging frictionless on mobile devices
  - Responsive exercise selector: Full-screen dialog on mobile, popover on desktop with search and recently-used sorting
  - Optimized mobile layout: Fixed form positioning above bottom nav with proper spacing and scroll behavior
  - Footer cleanup: Hidden on mobile, moved branding/feedback to Settings page About section
  - Improved autofocus: Increased delay (50ms → 100ms) for better reliability on mobile devices
  - Animation polish: Smooth set history card entrance with spring physics
  - Key improvements: Reduced time-to-log from ~15s to <5s, better one-handed operation, history section only scrolls when content overflows

- **Per-user rate limiting**: Added rate limiting for AI-backed endpoints to prevent abuse
  - `exercise:create`: 10 requests/minute (env-configurable)
  - `aiReport:onDemand`: 5 requests/day (env-configurable)
  - Fixed-window rate limiting stored in Convex with automatic expiration

- **Build version display**: Added semantic version display in footer (replaces "vdev" in production)

- **Release automation (release-please)**: Set up automated changelog generation and version management

### Changed

- **Brutalist design system migration**: Complete migration to brutalist design system with 100% compliance
  - Created BRUTALIST_TYPOGRAPHY system with semantic pairings
  - Established PRECISION_TIMING constants using golden ratio (φ ≈ 0.618)
  - Added chrome accent system (chromeHighlight, chromeShadow, chromeGlow)
  - Migrated 7+ major components to typography pairings and motion presets
  - Fixed 35 design system violations across 16 files
  - Eliminated all rounded corners, standardized animation timing

- **UX: Contextual validation errors**: Improved user experience with self-explanatory error messages
  - Validation errors now include recovery hints (e.g., "leave weight empty for bodyweight")
  - Duration validation errors display verbatim instead of falling back to generic messages
  - Delete operations provide consistent feedback through centralized error handling

### Fixed

- **Type safety**: Restored type safety in `useLastSet` hook
- **Security**: Restricted test endpoints in production environment
- **Dependency security**: Updated dependencies to resolve CVE-2025-64756 (glob command injection)

### Performance

- **Dashboard performance**: 100x payload reduction via server-side date filtering (listSetsForDateRange query)
- **Analytics performance**: 20-50x speedup via Map-based lookups (O(n²) → O(n) complexity reduction)
- **AI report generation**: Parallelized exercises query for faster report generation

## [0.1.0] - Initial Release

### Added

- Basic workout tracking with exercises and sets
- Clerk authentication integration
- Convex backend with real-time sync
- Dark mode support
- Mobile-responsive design
- Exercise management (create, list, delete)
- Set logging with reps and optional weight
- Workout history view
- Duration-based exercises support
- AI-powered workout insights
- Analytics and activity calendar
