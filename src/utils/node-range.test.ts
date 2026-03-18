import type { TSESTree } from '@typescript-eslint/types';
import type * as TSESLint from '@typescript-eslint/utils/ts-eslint';
import type { Mock } from 'vitest';

import { AST_TOKEN_TYPES } from '@typescript-eslint/types';
import * as ASTUtils from '@typescript-eslint/utils/ast-utils';

import type * as general from './general';

import { getNodeRange, rangeToDiff } from './node-range';

// Mock dependencies
vi.mock('@typescript-eslint/utils/ast-utils', async (original) => ({
  ...(await original()),
  isClosingParenToken: vi.fn(),
  isOpeningParenToken: vi.fn(),
  isParenthesized: vi.fn()
}));

const getCommentsBefore = vi.hoisted(vi.fn<typeof general.getCommentsBefore>);
const isPartitionComment = vi.hoisted(vi.fn<typeof general.isPartitionComment>);
vi.mock('./general', () => ({ getCommentsBefore, isPartitionComment }));

describe('rangeToDiff', () => {
  it('should calculate difference between two positions in a range', () => {
    expect(rangeToDiff([5, 10])).toBe(5);
    expect(rangeToDiff([0, 20])).toBe(20);
    expect(rangeToDiff([10, 10])).toBe(0);
  });
});

describe('getNodeRange', () => {
  let mockNode: TSESTree.Node;
  let mockSourceCode: TSESLint.SourceCode;

  beforeEach(() => {
    vi.resetAllMocks();

    getCommentsBefore.mockReturnValue([]);
    mockNode = {
      loc: {
        end: { column: 10, line: 1 },
        start: { column: 0, line: 1 }
      },
      range: [10, 20]
    } as TSESTree.Node;
    mockSourceCode = {
      getTokenAfter: vi.fn(),
      getTokenBefore: vi.fn(),
      getTokensAfter: vi.fn().mockReturnValue([]),
      text: 'const example = 42;'
    } as unknown as TSESLint.SourceCode;
  });

  it('should return the node range by default', () => {
    expect(getNodeRange(mockNode, mockSourceCode)).toEqual(mockNode.range);
  });

  it('should adjust range when node is parenthesized', () => {
    (ASTUtils.isParenthesized as Mock).mockReturnValue(true);
    const mockOpenParen = { range: [8, 9] };
    const mockCloseParen = { range: [21, 22] };

    (mockSourceCode.getTokenBefore as Mock).mockReturnValue(mockOpenParen);
    (mockSourceCode.getTokenAfter as Mock).mockReturnValue(mockCloseParen);

    expect(getNodeRange(mockNode, mockSourceCode)).toEqual([8, 22]);
    expect(ASTUtils.isParenthesized).toHaveBeenCalledWith(mockNode, mockSourceCode);
    expect(mockSourceCode.getTokenBefore).toHaveBeenCalledWith(
      mockNode,
      ASTUtils.isOpeningParenToken
    );
    expect(mockSourceCode.getTokenAfter).toHaveBeenCalledWith(
      mockNode,
      ASTUtils.isClosingParenToken
    );
  });

  it('should handle nodes ending with semicolons or commas on the same line', () => {
    mockSourceCode.text = 'const example = 42;';
    const mockTokensAfter = [
      { loc: { start: { line: 1 } } },
      { loc: { start: { line: 1 } } }
    ];
    (mockSourceCode.getTokensAfter as Mock).mockReturnValue(mockTokensAfter);

    const range = getNodeRange(mockNode, mockSourceCode);

    expect(range).toEqual([10, 19]);
    expect(mockSourceCode.getTokensAfter).toHaveBeenCalledWith(mockNode, {
      count: 2,
      includeComments: true
    });
  });

  it('should not adjust end position when tokens after are on different line', () => {
    mockSourceCode.text = 'const example = 42;';
    const mockTokensAfter = [
      { loc: { start: { line: 1 } } },
      { loc: { start: { line: 2 } } }
    ];
    (mockSourceCode.getTokensAfter as Mock).mockReturnValue(mockTokensAfter);

    const range = getNodeRange(mockNode, mockSourceCode);

    expect(range).toEqual([10, 20]);
  });

  it('should include comments immediately before the node', () => {
    mockNode.loc.start.line = 3;
    getCommentsBefore.mockReturnValue([
      {
        loc: {
          end: { column: 5, line: 1 },
          start: { column: 0, line: 1 }
        },
        range: [0, 5],
        type: AST_TOKEN_TYPES.Line,
        value: ' Comment 1'
      },
      {
        loc: {
          end: { column: 5, line: 2 },
          start: { column: 0, line: 2 }
        },
        range: [6, 11],
        type: AST_TOKEN_TYPES.Line,
        value: ' Comment 2'
      }
    ]);

    const range = getNodeRange(mockNode, mockSourceCode);

    expect(range).toEqual([0, 20]);
    expect(getCommentsBefore).toHaveBeenCalledWith(mockNode, mockSourceCode);
  });

  it('should stop at partition comments', () => {
    isPartitionComment.mockImplementation((_, value) => value === ' Partition');
    mockNode.loc.start.line = 3;
    getCommentsBefore.mockReturnValue([
      {
        loc: {
          end: { column: 5, line: 1 },
          start: { column: 0, line: 1 }
        },
        range: [0, 5],
        type: AST_TOKEN_TYPES.Line,
        value: ' Partition'
      },
      {
        loc: {
          end: { column: 5, line: 2 },
          start: { column: 0, line: 2 }
        },
        range: [6, 11],
        type: AST_TOKEN_TYPES.Line,
        value: ' Regular comment'
      }
    ]);

    const range = getNodeRange(mockNode, mockSourceCode, {
      partitionByComment: true
    });

    expect(range).toEqual([6, 20]);
  });

  it('should stop at newlines between comments', () => {
    mockNode.loc.start.line = 4;
    getCommentsBefore.mockReturnValue([
      {
        loc: {
          end: { column: 5, line: 1 },
          start: { column: 0, line: 1 }
        },
        range: [0, 5],
        type: AST_TOKEN_TYPES.Line,
        value: ' Comment 1'
      },
      {
        loc: {
          end: { column: 5, line: 3 },
          start: { column: 0, line: 3 }
        },
        range: [6, 11],
        type: AST_TOKEN_TYPES.Line,
        value: ' Comment 2'
      }
    ]);

    const range = getNodeRange(mockNode, mockSourceCode);

    expect(range).toEqual([6, 20]);
  });

  it('should handle additional options', () => {
    getCommentsBefore.mockReturnValue([
      {
        loc: {
          end: { column: 5, line: 1 },
          start: { column: 0, line: 1 }
        },
        range: [0, 5],
        type: AST_TOKEN_TYPES.Line,
        value: ' SECTION'
      }
    ]);

    getNodeRange(mockNode, mockSourceCode, {
      matcher: 'regex',
      partitionByComment: 'SECTION'
    });

    expect(isPartitionComment).toHaveBeenCalledWith(
      'SECTION',
      ' SECTION',
      'regex'
    );
  });
});
