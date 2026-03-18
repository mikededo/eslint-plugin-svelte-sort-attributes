import type { TSESTree } from '@typescript-eslint/types';
import type * as TSESLint from '@typescript-eslint/utils/ts-eslint';

import { minimatch } from 'minimatch';

import type { Settings } from '../types';

export const matches = (
  value: string,
  pattern: string,
  type: 'minimatch' | 'regex'
) => type === 'regex'
  ? new RegExp(pattern).test(value)
  : minimatch(value, pattern, { nocomment: true });

export const isPartitionComment = (
  partitionComment: boolean | string | string[],
  comment: string,
  matcher: 'minimatch' | 'regex'
) =>
  (Array.isArray(partitionComment) && partitionComment.some((pattern) => matches(comment.trim(), pattern, matcher))) ||
  (typeof partitionComment === 'string' && matches(comment.trim(), partitionComment, matcher)) ||
  partitionComment === true;

export const getCommentsBefore = (
  node: TSESTree.Node,
  source: TSESLint.SourceCode
): TSESTree.Comment[] => source.getCommentsBefore(node).filter((comment) => {
  // 'getCommentsBefore' also returns comments that are right after code, filter those out
  const tokenBeforeComment = source.getTokenBefore(comment);
  return tokenBeforeComment?.loc.end.line !== comment.loc.end.line;
});

export const getCommentAfter = (
  node: TSESTree.Node,
  source: TSESLint.SourceCode
): null | TSESTree.Comment => {
  const token = source.getTokenAfter(node, {
    filter: ({ type, value }) =>
      !(type === 'Punctuator' && [',', ';'].includes(value)),
    includeComments: true
  });

  if (
    (token?.type === 'Block' || token?.type === 'Line') &&
    node.loc.end.line === token.loc.end.line
  ) {
    return token;
  }

  return null;
};

export const validateNoDuplicatedGroups = (
  groups: (string | string[])[]
): void => {
  const flattenGroups = groups.flat();
  const duplicatedGroups = flattenGroups.filter(
    (group, index) => flattenGroups.indexOf(group) !== index
  );

  if (duplicatedGroups.length) {
    throw new Error(`Duplicated group(s): ${duplicatedGroups.join(', ')}`);
  }
};

export const validateGroupsConfiguration = (
  groups: (string | string[])[],
  allowedPredefinedGroups: string[],
  allowedCustomGroups: string[]
): void => {
  const allowedGroupsSet = new Set([
    ...allowedCustomGroups,
    ...allowedPredefinedGroups
  ]);
  const invalidGroups = groups
    .flat()
    .filter((group) => !allowedGroupsSet.has(group));
  if (invalidGroups.length) {
    throw new Error(`Invalid group(s): ${invalidGroups.join(', ')}`);
  }

  validateNoDuplicatedGroups(groups);
};

export const pairwise = <T>(
  nodes: T[],
  callback: (left: T, right: T, iteration: number) => void
) => {
  if (nodes.length > 1) {
    for (let i = 1; i < nodes.length; i++) {
      const left = nodes.at(i - 1);
      const right = nodes.at(i);

      if (left && right) {
        callback(left, right, i - 1);
      }
    }
  }
};

export const getSettings = (
  settings: TSESLint.SharedConfigurationSettings = {}
): Settings => {
  if (!settings['svelte-sort-attributes']) {
    return {};
  }

  const getInvalidOptions = (object: Record<string, unknown>) => {
    const allowedOptions: (keyof Settings)[] = [
      'partitionByComment',
      'partitionByNewLine',
      'specialCharacters',
      'ignorePattern',
      'ignoreCase',
      'matcher',
      'order',
      'type'
    ];

    return Object.keys(object).filter(
      (key) => !allowedOptions.includes(key as keyof Settings)
    );
  };

  const pluginSettings = settings['svelte-sort-attributes'] as Record<string, unknown>;
  const invalidOptions = getInvalidOptions(pluginSettings);
  if (invalidOptions.length) {
    throw new Error(
      `Invalid 'svelte-sort-attributes' setting(s): ${invalidOptions.join(', ')}`
    );
  }

  return settings['svelte-sort-attributes'] as Settings;
};

export const complete = <T extends { [key: string]: unknown }>(
  options: Partial<T> = {},
  settings: Settings = {},
  defaults: T
): T => Object.assign(defaults, settings, options);
