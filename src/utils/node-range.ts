import type { TSESTree } from '@typescript-eslint/types';
import type * as TSESLint from '@typescript-eslint/utils/ts-eslint';

import * as ASTUtils from '@typescript-eslint/utils/ast-utils';

import { getCommentsBefore, isPartitionComment } from './general';

export const getNodeRange = (
  node: TSESTree.Node,
  sourceCode: TSESLint.SourceCode,
  additionalOptions?: {
    matcher?: 'minimatch' | 'regex';
    partitionByComment?: boolean | string | string[];
  }
): TSESTree.Range => {
  let start = node.range.at(0)!;
  let end = node.range.at(1)!;

  const raw = sourceCode.text.slice(start, end);

  if (ASTUtils.isParenthesized(node, sourceCode)) {
    const bodyOpeningParen = sourceCode.getTokenBefore(
      node,
      ASTUtils.isOpeningParenToken
    )!;

    const bodyClosingParen = sourceCode.getTokenAfter(
      node,
      ASTUtils.isClosingParenToken
    )!;

    start = bodyOpeningParen.range.at(0)!;
    end = bodyClosingParen.range.at(1)!;
  }

  if (raw.endsWith(';') || raw.endsWith(',')) {
    const tokensAfter = sourceCode.getTokensAfter(node, {
      count: 2,
      includeComments: true
    });

    if (node.loc.start.line === tokensAfter.at(1)?.loc.start.line) {
      end -= 1;
    }
  }
  const comments = getCommentsBefore(node, sourceCode);
  const partitionComment = additionalOptions?.partitionByComment ?? false;
  const partitionCommentMatcher = additionalOptions?.matcher ?? 'minimatch';

  // Iterate on all comments starting from the bottom until we reach the last
  // of the comments, a newline between comments, or a partition comment
  let relevantTopComment: TSESTree.Comment | undefined;
  for (let i = comments.length - 1; i >= 0; i--) {
    const comment = comments[i];
    if (
      isPartitionComment(
        partitionComment,
        comment.value,
        partitionCommentMatcher
      )
    ) {
      break;
    }
    // Check for newlines between comments or between the first comment and
    // the node.
    const previousCommentOrNodeStartLine =
      i === comments.length - 1
        ? node.loc.start.line
        : comments[i + 1].loc.start.line;
    if (comment.loc.end.line !== previousCommentOrNodeStartLine - 1) {
      break;
    }
    relevantTopComment = comment;
  }

  if (relevantTopComment) {
    start = relevantTopComment.range.at(0)!;
  }

  return [start, end];
};

export const rangeToDiff = (range: TSESTree.Range): number => range[1] - range[0];
