import type { TSESTree } from '@typescript-eslint/types';

export type AlphabeticalCompareOptions = {
  ignoreCase: boolean;
  specialCharacters: 'keep' | 'remove' | 'trim';
  type: 'alphabetical';
} & BaseCompareOptions;

export type BaseCompareOptions = {
  order: 'asc' | 'desc';
  /**
   * Custom function to get the value of the node. By default, returns the node's name.
   */
  nodeValueGetter?: (node: SortingNode) => string;
};

export type CompareOptions =
  | AlphabeticalCompareOptions |
  LineLengthCompareOptions |
  NaturalCompareOptions;

export type ExtraOptions<T extends SortingNode> = {
  /**
   * If not provided, `options` will be used. If function returns null, nodes
   * will not be sorted within the group.
   */
  getGroupCompareOptions?: (groupNumber: number) => CompareOptions | null;
  isNodeIgnored?: (node: T) => boolean;
};

export type GroupOptions = { groups: (string | string[])[] };

export type LineLengthCompareOptions = {
  type: 'line-length';
  maxLineLength?: number;
} & BaseCompareOptions;

export type NaturalCompareOptions = {
  ignoreCase: boolean;
  specialCharacters: 'keep' | 'remove' | 'trim';
  type: 'natural';
} & BaseCompareOptions;

export type Settings = Partial<{
  ignoreCase: boolean;
  ignorePattern: string[];
  matcher: 'minimatch' | 'regex';
  order: 'asc' | 'desc';
  partitionByComment: boolean | string | string[];
  partitionByNewLine: boolean;
  specialCharacters: 'keep' | 'remove' | 'trim';
  type: 'alphabetical' | 'line-length' | 'natural';
}>;

export type SortingNode<Node extends TSESTree.Node = TSESTree.Node> = {
  name: string;
  node: Node;
  size: number;
  group?: string;
  hasMultipleImportDeclarations?: boolean;
};

export type UseGroupProps = {
  groups: (string | string[])[];
  matcher: 'minimatch' | 'regex';
};
