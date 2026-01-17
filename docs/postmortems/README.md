# Postmortems

Blameless postmortems for production incidents. Focus on systems and processes, not individuals.

## Format

Use `TEMPLATE.md` as the starting point. Name files: `YYYY-MM-DD-brief-description.md`

## Principles

1. **Blameless** - Focus on what happened, not who did it
2. **Actionable** - Every mitigation item should be concrete and assignable
3. **Proportional** - Match depth of analysis to severity of incident
4. **Forward-looking** - Emphasis on prevention, not punishment

## Index

| Date | Severity | Title | Key Lesson |
|------|----------|-------|------------|
| 2026-01-16 | High | [Stripe Env Vars](./2026-01-16-stripe-env-vars.md) | Check config before code |
