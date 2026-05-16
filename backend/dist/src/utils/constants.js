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
};
export const ROOMS = {
    user: (id) => `user:${id}`,
    post: (id) => `post:${id}`,
    geo: (hash) => `geo:${hash}`,
};
//# sourceMappingURL=constants.js.map