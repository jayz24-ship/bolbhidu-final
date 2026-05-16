export const EVENTS = {
  FEED_POST_CREATED: 'feed.post.created',
  POST_AI_RESULT: 'post.ai.result',
  POST_LIKE_UPDATED: 'post.like.updated',
  POST_COMMENT_CREATED: 'post.comment.created',
  POST_SHARE_CREATED: 'post.share.created',
  POST_ESCALATED: 'post.escalated',
  ISSUE_CREATED: 'issue.created',
  ISSUE_UPDATED: 'issue.updated',
  ISSUE_COMPLETED: 'issue.completed',
  ISSUE_VALIDATED: 'issue.validated',
  ISSUE_REJECTED: 'issue.rejected',
  USER_ENFORCEMENT_UPDATED: 'user.enforcement.updated',
} as const;

export const ROOMS = {
  user: (id: string) => `user:${id}`,
  post: (id: string) => `post:${id}`,
  geo: (hash: string) => `geo:${hash}`,
};
