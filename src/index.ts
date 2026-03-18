/**
 * DISCLAIMER
 * All credits to @azat-io, as this code is a modification from his
 * implementation of eslint-plugin-perfectionist
 *
 * Svelte property sorting was discontinued after v4 of eslint-plugin-import
 * and a solution inside eslint-plugin-svelte does not fulfill my needs as
 * eslint-plugin-perfectionist did
 */

import type { FlatConfig } from '@typescript-eslint/utils/ts-eslint';

import { version } from '../package.json';
import sortSvelteAttributes from './rules/sort-attributes';

type BaseOptions = {
  order: 'asc' | 'desc';
  type: 'alphabetical' | 'line-length' | 'natural';
};

type RuleDeclaration = [RuleSeverity, object?];

type RuleSeverity = 'error' | 'off' | 'warn';

const name = 'svelte-sort-attributers';
const plugin = {
  name,
  rules: {
    'sort-attributes': sortSvelteAttributes
  },
  version
};

const getRules = (options: BaseOptions): Record<string, RuleDeclaration> =>
  Object.fromEntries(
    Object.entries(plugin.rules).reduce(
      (accumulator: [string, RuleDeclaration][], [ruleName, ruleValue]) =>
        ruleValue.meta.deprecated
          ? accumulator
          : [...accumulator, [`${name}/${ruleName}`, ['error', options]]],
      []
    )
  );

const createConfig = (options: BaseOptions): FlatConfig.Config => ({
  plugins: {
    [name]: plugin
  },
  rules: getRules(options)
});

export default {
  ...plugin,
  configs: {
    'recommended-alphabetical': createConfig({ order: 'asc', type: 'alphabetical' }),
    'recommended-line-length': createConfig({ order: 'desc', type: 'line-length' }),
    'recommended-natural': createConfig({ order: 'asc', type: 'natural' })
  }
};
