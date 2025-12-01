---
"volume": patch
---

**UX: Contextual validation errors + delete feedback**

Improved user experience with self-explanatory error messages and clear delete operation feedback:

- Validation errors now include recovery hints (e.g., "leave weight empty for bodyweight" instead of just stating numeric ranges)
- Duration validation errors display verbatim instead of falling back to generic messages
- Delete operations provide consistent feedback through centralized error handling
- Added comprehensive test coverage (17 tests) for delete flow contract

Users now understand both what went wrong and how to fix it, reducing friction during workout logging and data management.
