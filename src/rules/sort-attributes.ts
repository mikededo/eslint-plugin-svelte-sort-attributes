/**
 * DISCLAIMER
 * All credits to @azat-io, as this code is a modification from his
 * implementation of eslint-plugin-perfectionist
 *
 * Svelte property sorting was discontinued after v4 of eslint-plugin-import
 * and a solution inside eslint-plugin-svelte does not fulfill my needs as
 * eslint-plugin-perfectionist did
 */

import type { TSESLint } from '@typescript-eslint/utils';
import type { AST } from 'svelte-eslint-parser';

import { ESLintUtils } from '@typescript-eslint/utils';
import path from 'node:path';

import {
  complete,
  getGroupNumber,
  getSettings,
  makeFixes,
  pairwise,
  rangeToDiff,
  sortNodesByGroups,
  useGroups,
  validateGroupsConfiguration
} from '../utils';

type Context = Readonly<TSESLint.RuleContext<MESSAGE_ID, Options<string[]>>>;
type Group<T extends string[]> =
  | 'multiline' |
  'shorthand' |
  'svelte-shorthand' |
  'unknown' |
  T[number];
type GroupNameAttribute = |
  AST.SvelteAttribute |
  AST.SvelteDirective |
  AST.SvelteGenericsDirective |
  AST.SvelteShorthandAttribute |
  AST.SvelteSpecialDirective |
  AST.SvelteStyleDirective;
type MESSAGE_ID =
  | 'unexpectedSvelteAttributesGroupOrder' |
  'unexpectedSvelteAttributesOrder';

type Options<T extends string[]> = [
  Partial<{
    customGroups: { [key in T[number]]: string | string[] };
    groups: (Group<T> | Group<T>[])[];
    ignoreCase: boolean;
    matcher: 'minimatch' | 'regex';
    order: 'asc' | 'desc';
    specialCharacters: 'keep' | 'remove' | 'trim';
    type: 'alphabetical' | 'line-length' | 'natural';
  }>
];

const getGroupName = (context: Context, attribute: GroupNameAttribute) => {
  if (attribute.key.type === 'SvelteSpecialDirectiveKey') {
    return context.sourceCode.text.slice(...attribute.key.range);
  } else if (typeof attribute.key.name === 'string') {
    return attribute.key.name;
  }

  return context.sourceCode.text.slice(...attribute.key.range);
};

export default ESLintUtils.RuleCreator((name) => name)<Options<string[]>, MESSAGE_ID>({
  create: (context) => {
    if (path.extname(context.filename) !== '.svelte') {
      return {};
    }

    return {
      SvelteStartTag: (node: AST.SvelteStartTag) => {
        if (node.attributes.length > 1) {
          const settings = getSettings(context.settings);
          const options = complete(context.options.at(0), settings, {
            customGroups: {},
            groups: [],
            ignoreCase: true,
            matcher: 'minimatch',
            order: 'asc',
            specialCharacters: 'keep',
            type: 'alphabetical'
          } as const);

          validateGroupsConfiguration(
            options.groups,
            ['svelte-shorthand', 'multiline', 'shorthand', 'unknown'],
            Object.keys(options.customGroups)
          );

          const parts: Array<Array<{
            group?: string;
            name: string;
            node: any;
            size: number;
          }>> = node.attributes.reduce(
            (acc: Array<Array<{
              group?: string;
              name: string;
              node: any;
              size: number;
            }>>, attribute) => {
              if (attribute.type === 'SvelteSpreadAttribute') {
                acc.push([]);
                return acc;
              }

              const { defineGroup, getGroup, setCustomGroups } =
                useGroups(options);
              const name = getGroupName(context, attribute);

              setCustomGroups(options.customGroups, name);

              if (attribute.type === 'SvelteShorthandAttribute') {
                defineGroup('svelte-shorthand');
                defineGroup('shorthand');
              }

              const isShortHand = !('value' in attribute) ||
                (Array.isArray(attribute.value) && !attribute.value.at(0));
              if (isShortHand) {
                defineGroup('shorthand');
              }

              if (attribute.loc.start.line !== attribute.loc.end.line) {
                defineGroup('multiline');
              }

              acc.at(-1)!.push({
                group: getGroup(),
                name,
                node: attribute,
                size: rangeToDiff(attribute.range)
              });

              return acc;
            },
            [[]]
          );

          for (const nodes of parts) {
            const sortedNodes = sortNodesByGroups(nodes, options);

            pairwise(nodes, (left, right) => {
              const indexOfLeft = sortedNodes.indexOf(left);
              const indexOfRight = sortedNodes.indexOf(right);

              if (indexOfLeft > indexOfRight) {
                const leftNum = getGroupNumber(options.groups, left);
                const rightNum = getGroupNumber(options.groups, right);
                context.report({
                  data: {
                    left: left.name,
                    leftGroup: left.group,
                    right: right.name,
                    rightGroup: right.group
                  },
                  fix: (fixer) => makeFixes(fixer, nodes, sortedNodes, context.sourceCode),
                  messageId:
                    leftNum !== rightNum
                      ? 'unexpectedSvelteAttributesGroupOrder'
                      : 'unexpectedSvelteAttributesOrder',
                  node: right.node
                });
              }
            });
          }
        }
      }
    };
  },
  defaultOptions: [
    {
      customGroups: {},
      groups: [],
      ignoreCase: true,
      matcher: 'minimatch',
      order: 'asc',
      specialCharacters: 'keep',
      type: 'alphabetical'
    }
  ],
  meta: {
    deprecated: true,
    docs: {
      description: 'Enforce sorted Svelte attributes.'
    },
    fixable: 'code',
    messages: {
      unexpectedSvelteAttributesGroupOrder:
        'Expected "{{right}}" ({{rightGroup}}) to come before "{{left}}" ({{leftGroup}}).',
      unexpectedSvelteAttributesOrder:
        'Expected "{{right}}" to come before "{{left}}".'
    },
    schema: [
      {
        additionalProperties: false,
        properties: {
          customGroups: {
            additionalProperties: {
              oneOf: [
                { type: 'string' },
                {
                  items: { type: 'string' },
                  type: 'array'
                }
              ]
            },
            description: 'Specifies custom groups.',
            type: 'object'
          },
          groups: {
            description: 'Specifies the order of the groups.',
            items: {
              oneOf: [
                { type: 'string' },
                {
                  items: { type: 'string' },
                  type: 'array'
                }
              ]
            },
            type: 'array'
          },
          ignoreCase: {
            description:
              'Controls whether sorting should be case-sensitive or not.',
            type: 'boolean'
          },
          matcher: {
            description: 'Specifies the string matcher.',
            enum: ['minimatch', 'regex'],
            type: 'string'
          },
          order: {
            description:
              'Determines whether the sorted items should be in ascending or descending order.',
            enum: ['asc', 'desc'],
            type: 'string'
          },
          specialCharacters: {
            description:
              'Controls how special characters should be handled before sorting.',
            enum: ['remove', 'trim', 'keep'],
            type: 'string'
          },
          type: {
            description: 'Specifies the sorting method.',
            enum: ['alphabetical', 'natural', 'line-length'],
            type: 'string'
          }
        },
        type: 'object'
      }
    ],
    type: 'suggestion'
  },
  name: 'sort-attributes'
});
