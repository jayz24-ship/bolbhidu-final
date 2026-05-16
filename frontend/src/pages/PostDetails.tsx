import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { usePost } from '../contexts/PostContext';
import PostCard from '../components/PostCard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Card, CardContent } from '../components/ui/card';
import { Separator } from '../components/ui/separator';
import { toast } from 'sonner';

const PostDetails: React.FC = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { getPostById, getCommentsByPostId, likePost, addComment, fetchComments } = usePost();
  const [post, setPost] = useState(getPostById(postId!));
  const [comments, setComments] = useState(getCommentsByPostId(postId!));
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!post) {
      toast.error('Post not found');
      navigate('/app/feed');
      return;
    }
    
    // Fetch comments from backend
    fetchComments(postId!);
  }, [post, postId, navigate, fetchComments]);

  // Update local comments when context changes
  useEffect(() => {
    setComments(getCommentsByPostId(postId!));
  }, [postId, getCommentsByPostId]);

  const handleLike = () => {
    if (post) {
      likePost(post.id);
      setPost(getPostById(post.id)); // Update local state
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Post link copied to clipboard!');
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    setIsSubmitting(true);

    try {
      await addComment(postId!, newComment.trim());
      setComments(getCommentsByPostId(postId!)); // Update comments
      setPost(getPostById(postId!)); // Update post (for comment count)
      setNewComment('');
      toast.success('Comment added successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to add comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!post) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Post not found</h2>
        <p className="text-muted-foreground mb-4">
          The post you're looking for doesn't exist or has been removed.
        </p>
        <Button onClick={() => navigate('/app/feed')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Feed
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate('/app/feed')}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Feed
      </Button>

      {/* Post */}
      <PostCard
        post={post}
        onLike={handleLike}
        onShare={handleShare}
      />

      {/* Comments Section */}
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-6">
            Comments ({comments.length})
          </h2>

          {/* Add Comment Form */}
          <form onSubmit={handleAddComment} className="mb-6">
            <div className="flex space-x-3">
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face" />
                <AvatarFallback>JD</AvatarFallback>
              </Avatar>
              <div className="flex-1 flex space-x-2">
                <Input
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1"
                  disabled={isSubmitting}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={isSubmitting || !newComment.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </form>

          <Separator className="mb-6" />

          {/* Comments List */}
          <div className="space-y-4">
            {comments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  No comments yet. Be the first to comment!
                </p>
              </div>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex space-x-3">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={comment.userAvatar} alt={comment.username} />
                    <AvatarFallback>{comment.username.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="bg-muted rounded-2xl px-4 py-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-semibold text-sm">{comment.username}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(comment.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm">{comment.content}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PostDetails;