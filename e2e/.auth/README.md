# Playwright Auth Storage

This directory is used to store authentication state (cookies, local storage) for Playwright tests.
It allows tests to share login sessions and avoid logging in for every single test file.

**Note:** The contents of this directory (except this README) are ignored by git to prevent committing sensitive session tokens.
