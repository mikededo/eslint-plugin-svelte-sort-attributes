# eslint-plugin-svelte-sort-attributes

## 2.0.0

### Major Changes

- Migrate plugin runtime to be compatible with ESLint v10 while preserving ESLint v9 support. ([`03d33fa`](https://github.com/mikededo/eslint-plugin-svelte-sort-attributes/commit/03d33fa9e10ebac1081b4b84b7341092080fce7d))

  Breaking changes:

  - Remove legacy `.eslintrc` preset exports (`recommended-*-legacy`).
  - Document flat-config usage only.

  Internal/runtime changes:

  - Replace root `@typescript-eslint/utils` runtime imports with stable subpath imports.
  - Update `@typescript-eslint/types` and `@typescript-eslint/utils` to versions that declare ESLint v10 support.

## 1.3.0

### Minor Changes

- Update dependencies ([`3ce1757`](https://github.com/mikededo/eslint-plugin-svelte-sort-attributes/commit/3ce175795d900047802cdeb56b6b358ce4494b55))

## 1.2.0

### Minor Changes

- chore: update deps ([`7df61e6`](https://github.com/mikededo/eslint-plugin-svelte-sort-attributes/commit/7df61e6465b3bec8f27f54ad9713af5303ff3d9a))

## 1.1.5

### Patch Changes

- Update docs ([`c8791e7`](https://github.com/mikededo/eslint-plugin-svelte-sort-attributes/commit/c8791e771b9dde8c0f2aef3c8df486bb581a2c5b))

## 1.1.4

### Patch Changes

- Add missing `files` prop ([`e702ed0`](https://github.com/mikededo/eslint-plugin-svelte-sort-attributes/commit/e702ed0be6d9d5b0c5337e24ef4ed35078412c90))

## 1.1.3

### Patch Changes

- Add missing build script ([`f67395d`](https://github.com/mikededo/eslint-plugin-svelte-sort-attributes/commit/f67395dee5bcc10e99ba0771171a2f4bafdff4ea))

## 1.1.2

### Patch Changes

- Minor changes ([`d13c6c5`](https://github.com/mikededo/eslint-plugin-svelte-sort-attributes/commit/d13c6c58574e9c2598137ccaec9de0d9d1ea04ca))

## 1.1.1

### Patch Changes

- Make package public ([`095d6cd`](https://github.com/mikededo/eslint-plugin-svelte-sort-attributes/commit/095d6cd09d23c679b3b2d848c6bea88ba8f5474a))

## 1.1.0

### Minor Changes

- Removed unused options ([#2](https://github.com/mikededo/eslint-plugin-svelte-sort-attributes/pull/2))

### Patch Changes

- Corrected dependency versions ([#2](https://github.com/mikededo/eslint-plugin-svelte-sort-attributes/pull/2))

## 1.0.0

### Major Changes

- Plugin implementation ([`fe1508e`](https://github.com/mikededo/eslint-plugin-svelte-sort-attributes/commit/fe1508ec1b086f1a5b86a68c5a542de79e50ed90))
