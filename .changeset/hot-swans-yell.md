---
"eslint-plugin-svelte-sort-attributes": major
---

Migrate plugin runtime to be compatible with ESLint v10 while preserving ESLint v9 support.

Breaking changes:
- Remove legacy `.eslintrc` preset exports (`recommended-*-legacy`).
- Document flat-config usage only.

Internal/runtime changes:
- Replace root `@typescript-eslint/utils` runtime imports with stable subpath imports.
- Update `@typescript-eslint/types` and `@typescript-eslint/utils` to versions that declare ESLint v10 support.
