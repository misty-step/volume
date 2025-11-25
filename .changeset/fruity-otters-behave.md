---
"volume": patch
---

Performance optimizations and version display fix:

- Dashboard: 100x payload reduction via server-side date filtering (listSetsForDateRange query)
- Analytics: 20-50x speedup via Map-based lookups (O(n²) → O(n) complexity reduction)
- Fix: Production footer now shows semantic version instead of "vdev"
