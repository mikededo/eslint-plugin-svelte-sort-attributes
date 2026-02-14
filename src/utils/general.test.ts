import type { TSESTree } from '@typescript-eslint/types';
import type { TSESLint } from '@typescript-eslint/utils';
import type { Mock } from 'vitest';

import { minimatch } from 'minimatch';

import {
  complete,
  getCommentAfter,
  getCommentsBefore,
  getSettings,
  isPartitionComment,
  matches,
  pairwise,
  validateGroupsConfiguration,
  validateNoDuplicatedGroups
} from './general';

vi.mock('minimatch', () => ({
  minimatch: vi.fn()
}));

describe('matches', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should use RegExp for regex matcher', () => {
    expect(matches('hello', 'h.*o', 'regex')).toBe(true);
    expect(matches('world', 'h.*o', 'regex')).toBe(false);
  });

  it('should use minimatch for minimatch matcher', () => {
    (minimatch as unknown as Mock).mockImplementation(() => true);

    matches('file.js', '*.js', 'minimatch');

    expect(minimatch).toHaveBeenCalledWith('file.js', '*.js', { nocomment: true });
  });
});

describe('isPartitionComment', () => {
  it('should return true if partition comment is true', () => {
    expect(isPartitionComment(true, 'any comment', 'regex')).toBe(true);
  });

  it('should match string pattern for string partition comment', () => {
    expect(isPartitionComment('TODO', 'TODO: Fix this', 'regex')).toBe(true);
    expect(isPartitionComment('FIXME', 'TODO: Fix this', 'regex')).toBe(false);
  });

  it('should match any pattern for array partition comment', () => {
    expect(isPartitionComment(['TODO', 'FIXME'], 'TODO: Fix this', 'regex')).toBe(true);
    expect(isPartitionComment(['TODO', 'FIXME'], 'FIXME: Later', 'regex')).toBe(true);
    expect(isPartitionComment(['TODO', 'FIXME'], 'NOTE: Something', 'regex')).toBe(false);
  });
});

describe('getCommentsBefore', () => {
  let mockNode: TSESTree.Node;
  let mockSourceCode: TSESLint.SourceCode;
  let mockComments: TSESTree.Comment[];

  beforeEach(() => {
    mockNode = {
      loc: { end: { column: 10, line: 5 }, start: { column: 0, line: 5 } },
      range: [50, 60]
    } as TSESTree.Node;

    mockComments = [
      {
        loc: { end: { column: 10, line: 3 }, start: { column: 0, line: 3 } },
        range: [20, 30],
        type: 'Line',
        value: ' Comment 1'
      },
      {
        loc: { end: { column: 10, line: 4 }, start: { column: 0, line: 4 } },
        range: [35, 45],
        type: 'Line',
        value: ' Comment 2'
      }
    ] as unknown as TSESTree.Comment[];

    mockSourceCode = {
      getCommentsBefore: vi.fn().mockReturnValue(mockComments),
      getTokenBefore: vi.fn()
    } as unknown as TSESLint.SourceCode;
  });

  it('should return comments before node without tokens ending on same line', () => {
    // For first comment, no token before
    (mockSourceCode.getTokenBefore as Mock).mockReturnValueOnce(null);

    // For second comment, token ends on different line
    (mockSourceCode.getTokenBefore as Mock).mockReturnValueOnce({
      loc: { end: { line: 2 } }
    });

    const result = getCommentsBefore(mockNode, mockSourceCode);

    expect(result).toEqual(mockComments);
    expect(mockSourceCode.getCommentsBefore).toHaveBeenCalledWith(mockNode);
  });

  it('should filter out comments that are on the same line as previous token', () => {
    // For first comment, token ends on same line as comment
    (mockSourceCode.getTokenBefore as Mock).mockReturnValueOnce({
      loc: { end: { line: 3 } }
    });

    // For second comment, token ends on different line
    (mockSourceCode.getTokenBefore as Mock).mockReturnValueOnce({
      loc: { end: { line: 3 } }
    });

    const result = getCommentsBefore(mockNode, mockSourceCode);

    expect(result).toEqual([mockComments[1]]);
  });
});

describe('getCommentAfter', () => {
  let mockNode: TSESTree.Node;
  let mockSourceCode: TSESLint.SourceCode;

  beforeEach(() => {
    mockNode = {
      loc: { end: { column: 10, line: 1 }, start: { column: 0, line: 1 } },
      range: [0, 10]
    } as TSESTree.Node;

    mockSourceCode = {
      getTokenAfter: vi.fn()
    } as unknown as TSESLint.SourceCode;
  });

  it('should return null when no comment is found after node', () => {
    (mockSourceCode.getTokenAfter as Mock).mockReturnValue(null);

    expect(getCommentAfter(mockNode, mockSourceCode)).toBeNull();
    expect(mockSourceCode.getTokenAfter).toHaveBeenCalledWith(mockNode, {
      filter: expect.any(Function),
      includeComments: true
    });
  });

  it('should return comment when found on the same line', () => {
    const comment = {
      loc: { end: { column: 25, line: 1 }, start: { column: 15, line: 1 } },
      type: 'Line',
      value: ' Comment'
    };
    (mockSourceCode.getTokenAfter as Mock).mockReturnValue(comment);

    expect(getCommentAfter(mockNode, mockSourceCode)).toEqual(comment);
  });

  it('should return null when comment is on different line', () => {
    const comment = {
      loc: { end: { column: 10, line: 2 }, start: { column: 0, line: 2 } },
      type: 'Line',
      value: ' Comment'
    };
    (mockSourceCode.getTokenAfter as Mock).mockReturnValue(comment);

    expect(getCommentAfter(mockNode, mockSourceCode)).toBeNull();
  });

  it('should filter out punctuation tokens', () => {
    (mockSourceCode.getTokenAfter as Mock).mockImplementation((_, options) => {
      const filterFn = options.filter;
      expect(filterFn({ type: 'Punctuator', value: ',' })).toBe(false);
      expect(filterFn({ type: 'Punctuator', value: ';' })).toBe(false);
      expect(filterFn({ type: 'Punctuator', value: ':' })).toBe(true);
      expect(filterFn({ type: 'Keyword', value: 'const' })).toBe(true);

      return null;
    });

    getCommentAfter(mockNode, mockSourceCode);
  });
});

describe('validateNoDuplicatedGroups', () => {
  it('should not throw for unique groups', () => {
    expect(() => {
      validateNoDuplicatedGroups(['a', 'b', ['c', 'd']]);
    }).not.toThrow();
  });

  it('should throw for duplicated groups', () => {
    expect(() => {
      validateNoDuplicatedGroups(['a', 'b', ['a', 'c']]);
    }).toThrow('Duplicated group(s): a');
  });

  it('should list all duplicated groups', () => {
    expect(() => {
      validateNoDuplicatedGroups(['a', 'b', ['a', 'b', 'c']]);
    }).toThrow('Duplicated group(s): a, b');
  });
});

describe('validateGroupsConfiguration', () => {
  it('should not throw for valid groups', () => {
    expect(() => {
      validateGroupsConfiguration(
        ['allowed1', 'allowed2', ['allowed3']],
        ['allowed1', 'allowed2'],
        ['allowed3']
      );
    }).not.toThrow();
  });

  it('should throw for invalid groups', () => {
    expect(() => {
      validateGroupsConfiguration(
        ['allowed', 'invalid1', ['invalid2']],
        ['allowed'],
        []
      );
    }).toThrow('Invalid group(s): invalid1, invalid2');
  });
});

describe('pairwise', () => {
  it('should not call callback for empty array', () => {
    const callback = vi.fn();
    pairwise([], callback);
    expect(callback).not.toHaveBeenCalled();
  });

  it('should not call callback for single item array', () => {
    const callback = vi.fn();
    pairwise([1], callback);
    expect(callback).not.toHaveBeenCalled();
  });

  it('should call callback for each adjacent pair', () => {
    const callback = vi.fn();
    pairwise([1, 2, 3, 4], callback);

    expect(callback).toHaveBeenCalledTimes(3);
    expect(callback).toHaveBeenCalledWith(1, 2, 0);
    expect(callback).toHaveBeenCalledWith(2, 3, 1);
    expect(callback).toHaveBeenCalledWith(3, 4, 2);
  });
});

describe('getSettings', () => {
  it('should return empty object when no settings are provided', () => {
    expect(getSettings()).toEqual({});
  });

  it('should return empty object when no svelte-sort-attributes settings are provided', () => {
    expect(getSettings({ otherSetting: true })).toEqual({});
  });

  it('should return svelte-sort-attributes settings when provided', () => {
    expect(
      getSettings({ 'svelte-sort-attributes': { order: 'asc', type: 'natural' } })
    ).toEqual({ order: 'asc', type: 'natural' });
  });

  it('should throw for invalid svelte-sort-attributes settings', () => {
    expect(() => getSettings({
      'svelte-sort-attributes': { invalidOption: true, order: 'asc' }
    })).toThrow('Invalid \'svelte-sort-attributes\' setting(s): invalidOption');
  });

  it('should throw for multiple invalid svelte-sort-attributes settings', () => {
    expect(() => getSettings({
      'svelte-sort-attributes': { invalid1: true, invalid2: false }
    })).toThrow('Invalid \'svelte-sort-attributes\' setting(s): invalid1, invalid2');
  });
});

describe('complete', () => {
  it('should merge options, settings, and defaults', () => {
    expect(
      complete({ order: 'desc' }, { matcher: 'regex', order: 'asc' }, { order: 'asc' })
    ).toEqual({ matcher: 'regex', order: 'desc' });
  });
});
