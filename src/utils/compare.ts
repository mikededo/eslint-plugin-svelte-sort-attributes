import type { TSESLint } from '@typescript-eslint/utils';

import naturalCompare from 'natural-compare-lite';

import type { CompareOptions, SortingNode } from '../types';

import { getCommentAfter } from './general';
import { getNodeRange } from './node-range';

export const getFormatStringFunc = (
  ignoreCase: boolean,
  specialCharacters: 'keep' | 'remove' | 'trim'
) =>
  (value: string) => {
    let valueToCompare = value;
    if (ignoreCase) {
      valueToCompare = valueToCompare.toLowerCase();
    }

    switch (specialCharacters) {
      case 'remove':
        // eslint-disable-next-line regexp/no-obscure-range
        valueToCompare = valueToCompare.replaceAll(/[^A-ZÀ-ž]+/gi, '');
        break;
      case 'trim':
        // eslint-disable-next-line regexp/no-obscure-range
        valueToCompare = valueToCompare.replaceAll(/^[^A-ZÀ-ž]+/gi, '');
        break;
    }

    return valueToCompare.replaceAll(/\s/g, '');
  };

const getSortingFunction = (
  options: CompareOptions
): (a: SortingNode, b: SortingNode) => number => {
  const nodeValueGetter =
    options.nodeValueGetter ?? ((node: SortingNode) => node.name);

  if (options.type === 'alphabetical') {
    const formatString = getFormatStringFunc(
      options.ignoreCase,
      options.specialCharacters
    );

    return (aNode, bNode) =>
      formatString(nodeValueGetter(aNode)).localeCompare(
        formatString(nodeValueGetter(bNode))
      );
  } else if (options.type === 'natural') {
    const prepareNumeric = (string: string) => {
      // eslint-disable-next-line regexp/no-unused-capturing-group
      const formattedNumberPattern = /^[+-]?[\d ,_]+(\.[\d ,_]+)?$/;
      if (formattedNumberPattern.test(string)) {
        return string.replaceAll(/[ ,_]/g, '');
      }
      return string;
    };

    return (aNode, bNode) => {
      const formatString = getFormatStringFunc(
        options.ignoreCase,
        options.specialCharacters
      );
      return naturalCompare(
        prepareNumeric(formatString(nodeValueGetter(aNode))),
        prepareNumeric(formatString(nodeValueGetter(bNode)))
      );
    };
  }

  return (aNode, bNode) => {
    let aSize = aNode.size;
    let bSize = bNode.size;
    const { maxLineLength } = options;

    if (maxLineLength) {
      const isTooLong = (size: number, node: SortingNode) =>
        size > maxLineLength && node.hasMultipleImportDeclarations;

      if (isTooLong(aSize, aNode)) {
        aSize = nodeValueGetter(aNode).length + 10;
      }

      if (isTooLong(bSize, bNode)) {
        bSize = nodeValueGetter(bNode).length + 10;
      }
    }

    return aSize - bSize;
  };
};

export const compare = (
  a: SortingNode,
  b: SortingNode,
  options: CompareOptions
): number => {
  const orderCoefficient = options.order === 'asc' ? 1 : -1;
  return orderCoefficient * getSortingFunction(options)(a, b);
};

export const sortNodes = <T extends SortingNode>(
  nodes: T[],
  options: CompareOptions
): T[] => [...nodes].sort((a, b) => compare(a, b, options));

export const makeFixes = (
  fixer: TSESLint.RuleFixer,
  nodes: SortingNode[],
  sortedNodes: SortingNode[],
  source: TSESLint.SourceCode,
  additionalOptions?: {
    matcher: 'minimatch' | 'regex';
    partitionByComment: boolean | string | string[];
  }
) => {
  const fixes: TSESLint.RuleFix[] = [];
  const isSingleline =
    nodes.at(0)?.node.loc.start.line === nodes.at(-1)?.node.loc.end.line;

  for (let i = 0, max = nodes.length; i < max; i++) {
    const { node } = nodes.at(i)!;

    fixes.push(
      fixer.replaceTextRange(
        getNodeRange(node, source, additionalOptions),
        source.text.slice(
          ...getNodeRange(sortedNodes.at(i)!.node, source, additionalOptions)
        )
      )
    );

    const commentAfter = getCommentAfter(sortedNodes.at(i)!.node, source);

    if (commentAfter && !isSingleline) {
      const tokenBefore = source.getTokenBefore(commentAfter);
      const range: [number, number] = [
        tokenBefore!.range.at(1)!,
        commentAfter.range.at(1)!
      ];

      fixes.push(fixer.replaceTextRange(range, ''));

      const tokenAfterNode = source.getTokenAfter(node);

      fixes.push(
        fixer.insertTextAfter(
          tokenAfterNode?.loc.end.line === node.loc.end.line
            ? tokenAfterNode
            : node,
          source.text.slice(...range)
        )
      );
    }
  }

  return fixes;
};
