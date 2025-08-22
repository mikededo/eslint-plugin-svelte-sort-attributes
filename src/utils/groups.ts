import type {
  CompareOptions,
  ExtraOptions,
  GroupOptions,
  SortingNode,
  UseGroupProps
} from '../types';

import { sortNodes } from './compare';
import { matches } from './general';

export const useGroups = ({ groups, matcher }: UseGroupProps) => {
  let group: string | undefined;
  // For lookup performance
  const groupsSet = new Set(groups.flat());

  const defineGroup = (value: string, override = false) => {
    if ((!group || override) && groupsSet.has(value)) {
      group = value;
    }
  };

  const setCustomGroups = (
    customGroups:
      | { [key: string]: string | string[] } |
      undefined,
    name: string,
    params: { override?: boolean } = {}
  ) => {
    if (customGroups) {
      for (const [key, pattern] of Object.entries(customGroups)) {
        if (
          Array.isArray(pattern) &&
          pattern.some((patternValue) => matches(name, patternValue, matcher))
        ) {
          defineGroup(key, params.override);
        }

        if (typeof pattern === 'string' && matches(name, pattern, matcher)) {
          defineGroup(key, params.override);
        }
      }
    }
  };

  return {
    defineGroup,
    getGroup: () => group ?? 'unknown',
    setCustomGroups
  };
};

export const getGroupNumber = (
  groups: (string | string[])[],
  node: SortingNode
): number => {
  for (let i = 0, max = groups.length; i < max; i++) {
    const currentGroup = groups[i];
    const isCurrentNumber =
      node.group === currentGroup ||
      (Array.isArray(currentGroup) && typeof node.group === 'string' && currentGroup.includes(node.group));

    if (isCurrentNumber) {
      return i;
    }
  }

  return groups.length;
};

export const sortNodesByGroups = <T extends SortingNode>(
  nodes: T[],
  options: CompareOptions & GroupOptions,
  extraOptions?: ExtraOptions<T>
): T[] => {
  const nodesByNonIgnoredGroupNumber: { [key: number]: T[] } = {};
  const ignoredNodeIndices: number[] = [];
  for (const [index, sortingNode] of nodes.entries()) {
    if (extraOptions?.isNodeIgnored?.(sortingNode)) {
      ignoredNodeIndices.push(index);
      continue;
    }

    const groupNum = getGroupNumber(options.groups, sortingNode);
    nodesByNonIgnoredGroupNumber[groupNum] =
      nodesByNonIgnoredGroupNumber[groupNum] ?? [];
    nodesByNonIgnoredGroupNumber[groupNum].push(sortingNode);
  }

  const sortedNodes: T[] = [];
  for (const groupNumber of Object.keys(nodesByNonIgnoredGroupNumber).sort(
    (a, b) => Number(a) - Number(b)
  )) {
    const compareOptions = extraOptions?.getGroupCompareOptions
      ? extraOptions.getGroupCompareOptions(Number(groupNumber))
      : options;
    if (!compareOptions) {
      sortedNodes.push(...nodesByNonIgnoredGroupNumber[Number(groupNumber)]);
      continue;
    }
    sortedNodes.push(
      ...sortNodes(
        nodesByNonIgnoredGroupNumber[Number(groupNumber)],
        compareOptions
      )
    );
  }

  // Add ignored nodes at the same position as they were before linting
  for (const ignoredIndex of ignoredNodeIndices) {
    sortedNodes.splice(ignoredIndex, 0, nodes[ignoredIndex]);
  }

  return sortedNodes;
};
