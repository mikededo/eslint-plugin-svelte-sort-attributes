import type { TSESTree } from '@typescript-eslint/types';
import type * as TSESLint from '@typescript-eslint/utils/ts-eslint';
import type { Mock } from 'vitest';

import type { CompareOptions, SortingNode } from '../types';
import type * as general from './general';
import type * as nodeRange from './node-range';

import { compare, getFormatStringFunc, makeFixes, sortNodes } from './compare';

const getCommentAfter = vi.hoisted(vi.fn<typeof general.getCommentAfter>);
vi.mock('./general', () => ({ getCommentAfter }));

const getNodeRange = vi.hoisted(vi.fn<typeof nodeRange.getNodeRange>);
vi.mock('./node-range', () => ({ getNodeRange }));

const createMockNode = (id: number, line: number) => ({
  node: {
    loc: {
      end: { column: 10, line },
      start: { column: 0, line }
    },
    range: [id * 10, id * 10 + 10]
  }
});

const createMockSortingNode = (
  props: Partial<{ customValue: string } & SortingNode>
): SortingNode => ({
  hasMultipleImportDeclarations: false,
  name: '',
  node: {} as TSESTree.Node,
  size: 0,
  ...props
});

describe('getFormatStringFunc', () => {
  it('should handle ignoreCase option', () => {
    const formatter = getFormatStringFunc(true, 'keep');
    expect(formatter('Hello')).toBe('Hello'.toLowerCase());
    expect(formatter('WORLD')).toBe('WORLD'.toLowerCase());
  });

  it('should maintain case when ignoreCase is false', () => {
    const formatter = getFormatStringFunc(false, 'keep');
    expect(formatter('Hello')).toBe('Hello');
    expect(formatter('WORLD')).toBe('WORLD');
  });

  it('should remove special characters with "remove" option', () => {
    const formatter = getFormatStringFunc(false, 'remove');
    expect(formatter('Hello, World!')).toBe('HelloWorld');
    expect(formatter('@import/react')).toBe('importreact');
  });

  it('should trim special characters with "trim" option', () => {
    const formatter = getFormatStringFunc(false, 'trim');
    expect(formatter('$button')).toBe('button');
    expect(formatter('@import/react')).toBe('import/react');
  });

  it('should always remove whitespace', () => {
    const formatter = getFormatStringFunc(false, 'keep');
    expect(formatter('Hello World')).toBe('HelloWorld');
    expect(formatter('  spaced  text  ')).toBe('spacedtext');
  });
});

describe('compare', () => {
  describe('alphabetical sorting', () => {
    it('should sort in ascending order by default', () => {
      const options: CompareOptions = {
        ignoreCase: false,
        order: 'asc',
        specialCharacters: 'keep',
        type: 'alphabetical'
      };

      const a = createMockSortingNode({ name: 'b' });
      const b = createMockSortingNode({ name: 'a' });

      expect(compare(a, b, options)).toBeGreaterThan(0);
      expect(compare(b, a, options)).toBeLessThan(0);
    });

    it('should sort in descending order when specified', () => {
      const options: CompareOptions = {
        ignoreCase: false,
        order: 'desc',
        specialCharacters: 'keep',
        type: 'alphabetical'
      };

      const a = createMockSortingNode({ name: 'a' });
      const b = createMockSortingNode({ name: 'b' });

      expect(compare(a, b, options)).toBeGreaterThan(0);
      expect(compare(b, a, options)).toBeLessThan(0);
    });

    it('should respect ignoreCase option', () => {
      const options: CompareOptions = {
        ignoreCase: true,
        order: 'asc',
        specialCharacters: 'keep',
        type: 'alphabetical'
      };

      const a = createMockSortingNode({ name: 'B' });
      const b = createMockSortingNode({ name: 'a' });

      expect(compare(a, b, options)).toBeGreaterThan(0);
    });

    it('should use custom nodeValueGetter when provided', () => {
      const options: CompareOptions = {
        ignoreCase: false,
        // @ts-expect-error We are manually adding the customValue prop
        nodeValueGetter: (node) => node.customValue || '',
        order: 'asc',
        specialCharacters: 'keep',
        type: 'alphabetical'
      };

      expect(compare(
        createMockSortingNode({ customValue: 'z', name: 'a' }),
        createMockSortingNode({ customValue: 'a', name: 'z' } as any),
        options
      )).toBeGreaterThan(0);
    });
  });

  describe('natural sorting', () => {
    it('should sort numbers naturally', () => {
      const options: CompareOptions = {
        ignoreCase: false,
        order: 'asc',
        specialCharacters: 'keep',
        type: 'natural'
      };

      const a = createMockSortingNode({ name: 'item10' });
      const b = createMockSortingNode({ name: 'item2' });

      expect(compare(a, b, options)).toBeGreaterThan(0);
    });

    it('should handle formatted numbers', () => {
      const options: CompareOptions = {
        ignoreCase: false,
        order: 'asc',
        specialCharacters: 'keep',
        type: 'natural'
      };

      const a = createMockSortingNode({ name: '1,000.5' });
      const b = createMockSortingNode({ name: '100.5' });

      expect(compare(a, b, options)).toBeGreaterThan(0);
    });

    it('should respect descending order', () => {
      const options: CompareOptions = {
        ignoreCase: false,
        order: 'desc',
        specialCharacters: 'keep',
        type: 'natural'
      };

      const a = createMockSortingNode({ name: 'item2' });
      const b = createMockSortingNode({ name: 'item10' });

      expect(compare(a, b, options)).toBeGreaterThan(0);
    });
  });

  describe('line length sorting', () => {
    it('should sort by size when type is "line-length"', () => {
      expect(compare(createMockSortingNode({ size: 20 }), createMockSortingNode({ size: 10 }), {
        order: 'asc',
        type: 'line-length'
      })).toBeGreaterThan(0);
    });

    it('should handle maxLineLength option', () => {
      const a = createMockSortingNode({
        hasMultipleImportDeclarations: true,
        name: 'short',
        size: 20
      });
      const b = createMockSortingNode({
        hasMultipleImportDeclarations: false,
        name: 'veryLongName',
        size: 10
      });

      // Size of a should be adjusted to name.length + 10
      // Which is 'short'.length + 10 = 15
      expect(compare(a, b, {
        maxLineLength: 15,
        order: 'asc',
        type: 'line-length'
      })).toBeGreaterThan(0);
    });

    it('should respect descending order', () => {
      expect(compare(createMockSortingNode({ size: 10 }), createMockSortingNode({ size: 20 }), {
        order: 'desc',
        type: 'line-length'
      })).toBeGreaterThan(0);
    });
  });
});

describe('sortNodes', () => {
  it('should sort an array of nodes', () => {
    const nodes = [
      { name: 'c', size: 3 },
      { name: 'a', size: 1 },
      { name: 'b', size: 2 }
    ] as SortingNode[];

    const result = sortNodes(nodes, {
      ignoreCase: false,
      order: 'asc',
      specialCharacters: 'keep',
      type: 'alphabetical'
    });

    expect(result).toEqual([
      { name: 'a', size: 1 },
      { name: 'b', size: 2 },
      { name: 'c', size: 3 }
    ]);
    expect(nodes[0].name).toBe('c');
  });
});

describe('makeFixes', () => {
  let mockFixer: TSESLint.RuleFixer;
  let mockSourceCode: TSESLint.SourceCode;
  let nodes: SortingNode[];
  let sortedNodes: SortingNode[];

  beforeEach(() => {
    vi.resetAllMocks();

    mockFixer = {
      insertTextAfter: vi.fn().mockReturnValue({ range: [0, 0] }),
      replaceTextRange: vi.fn().mockReturnValue({ range: [0, 0] })
    } as unknown as TSESLint.RuleFixer;
    mockSourceCode = {
      getTokenAfter: vi.fn(),
      getTokenBefore: vi.fn(),
      text: 'mock source code'
    } as unknown as TSESLint.SourceCode;

    getNodeRange.mockImplementation((node) => node.range);

    nodes = [
      createMockNode(1, 1),
      createMockNode(2, 2),
      createMockNode(3, 3)
    ] as SortingNode[];

    sortedNodes = [
      createMockNode(3, 3),
      createMockNode(1, 1),
      createMockNode(2, 2)
    ] as SortingNode[];
  });

  it('should create fixes to replace each node', () => {
    expect(makeFixes(mockFixer, nodes, sortedNodes, mockSourceCode).length).toBe(3);
    expect(mockFixer.replaceTextRange).toHaveBeenCalledTimes(3);
    expect(mockFixer.replaceTextRange).toHaveBeenCalledWith(
      nodes[0].node.range,
      mockSourceCode.text.slice(...sortedNodes[0].node.range)
    );
  });

  it('should handle comments after nodes', () => {
    const mockComment = { range: [35, 45] } as TSESTree.Comment;
    const mockTokenBefore = { range: [25, 35] } as TSESTree.Token;
    const mockTokenAfterNode = { loc: { end: { line: 1 } } } as TSESTree.Token;

    getCommentAfter.mockReturnValue(mockComment);
    (mockSourceCode.getTokenBefore as Mock).mockReturnValue(mockTokenBefore);
    (mockSourceCode.getTokenAfter as Mock).mockReturnValue(mockTokenAfterNode);

    const fixes = makeFixes(mockFixer, nodes, sortedNodes, mockSourceCode);

    expect(fixes.length).toBe(9);
    expect(mockFixer.replaceTextRange).toHaveBeenCalledWith(
      [mockTokenBefore.range[1], mockComment.range[1]],
      ''
    );
    expect(mockFixer.insertTextAfter).toHaveBeenCalledWith(
      mockTokenAfterNode,
      mockSourceCode.text.slice(mockTokenBefore.range[1], mockComment.range[1])
    );
  });

  it('should handle single-line statements (no comment movement)', () => {
    const base = nodes.map((node) => ({
      ...node,
      node: {
        ...node.node,
        loc: {
          end: { column: 10, line: 1 },
          start: { column: 0, line: 1 }
        }
      }
    })) as SortingNode[];
    const sorted = sortedNodes.map((node) => ({
      ...node,
      node: {
        ...node.node,
        loc: {
          end: { column: 10, line: 1 },
          start: { column: 0, line: 1 }
        }
      }
    })) as SortingNode[];
    getCommentAfter.mockReturnValue({ range: [35, 45] } as TSESTree.Comment);

    expect(makeFixes(mockFixer, base, sorted, mockSourceCode).length).toBe(3);
  });

  it('should use node itself when no token after on same line', () => {
    const mockComment = { range: [35, 45] } as TSESTree.Comment;
    const mockTokenBefore = { range: [25, 35] } as TSESTree.Token;
    const mockTokenAfterNode = { loc: { end: { line: 2 } } } as TSESTree.Token;

    getCommentAfter.mockReturnValue(mockComment);
    (mockSourceCode.getTokenBefore as Mock).mockReturnValue(mockTokenBefore);
    (mockSourceCode.getTokenAfter as Mock).mockReturnValue(mockTokenAfterNode);

    makeFixes(mockFixer, nodes, sortedNodes, mockSourceCode);

    expect(mockFixer.insertTextAfter).toHaveBeenCalledWith(
      nodes[0].node,
      mockSourceCode.text.slice(mockTokenBefore.range[1], mockComment.range[1])
    );
  });
});
