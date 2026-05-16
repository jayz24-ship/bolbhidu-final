import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Share, MoreHorizontal, CheckCircle, XCircle, Clock, Bookmark, Trash2 } from 'lucide-react';
import { Post } from '../contexts/PostContext';
import { useAuth } from '../contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent } from './ui/card';
import { Progress } from './ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface PostCardProps {
  post: Post;
  onLike: (postId: string) => void;
  onComment?: (postId: string) => void;
  onShare?: (postId: string) => void;
  onSave?: (postId: string) => void;
  onDelete?: (postId: string) => void;
  showEngagement?: boolean;
}

const PostCard: React.FC<PostCardProps> = ({ post, onLike, onComment, onShare, onSave, onDelete, showEngagement = false }) => {
  const { user } = useAuth();
  const formatTimestamp = (timestamp: Date | string) => {
    const now = new Date();
    const timestampDate = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const diff = now.getTime() - timestampDate.getTime();
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (minutes < 60) {
      return `${minutes}m`;
    } else if (hours < 24) {
      return `${hours}h`;
    } else {
      return `${days}d`;
    }
  };

  return (
    <Card className={`rounded-2xl shadow-sm border hover:shadow-md transition-shadow ${
      post.aiVerdict === 'pending' ? 'border-yellow-400 dark:border-yellow-600 bg-yellow-50/30 dark:bg-yellow-950/20' : ''
    }`}>
      <CardContent className="p-6">
        {/* Pending Verification Banner */}
        {post.aiVerdict === 'pending' && (
          <div className="mb-4 p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg border border-yellow-300 dark:border-yellow-700">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-700 dark:text-yellow-300 animate-pulse" />
              <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                🤖 AI is verifying your post... This usually takes 5-10 seconds.
              </span>
            </div>
            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
              You'll be notified when verification is complete. Refresh if it takes too long.
            </p>
          </div>
        )}
        
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={post.userAvatar} alt={post.username} />
              <AvatarFallback>{post.username.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold hover:underline cursor-pointer">
                  {post.username}
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {post.category}
                </Badge>
                
                {/* AI Verification Badge */}
                {post.aiVerdict === 'accepted' && (
                  <Badge variant="default" className="text-xs bg-green-600 text-white flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Verified Issue
                    {post.aiScore && <span className="ml-1">({post.aiScore}%)</span>}
                  </Badge>
                )}
                {post.aiVerdict === 'rejected' && (
                  <Badge variant="destructive" className="text-xs flex items-center gap-1">
                    <XCircle className="h-3 w-3" />
                    Not an Issue
                    {post.aiScore && <span className="ml-1">({post.aiScore}%)</span>}
                  </Badge>
                )}
                {post.aiVerdict === 'pending' && (
                  <Badge variant="secondary" className="text-xs flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    AI Verifying...
                  </Badge>
                )}
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <span>{post.location}</span>
                <span>•</span>
                <span>{formatTimestamp(post.timestamp)}</span>
              </div>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onSave?.(post.id)}>
                <Bookmark className="h-4 w-4 mr-2" />
                Save post
              </DropdownMenuItem>
              {user?.id === post.userId && !post.isRegisteredAsIssue && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => onDelete?.(post.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete post
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Content */}
        <div className="mb-4">
          <p className="text-foreground leading-relaxed">{post.description}</p>
        </div>

        {/* Validated Issue Badge and Progress */}
        {post.isRegisteredAsIssue && post.issueStatus && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                  Validated as Issue
                </span>
                <Badge variant="secondary" className="text-xs">
                  {post.issueStatus === 'in_progress' ? 'In Progress' : 
                   post.issueStatus === 'completed' ? 'Completed' : 
                   post.issueStatus === 'pending' ? 'Pending' : post.issueStatus}
                </Badge>
              </div>
              {post.issueProgress !== undefined && post.issueProgress > 0 && (
                <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                  {post.issueProgress}%
                </span>
              )}
            </div>
            {post.issueProgress !== undefined && post.issueProgress > 0 && (
              <Progress value={post.issueProgress} className="h-2" />
            )}
          </div>
        )}

        {/* Media */}
        {post.mediaUrl && (
          <div className="mb-4">
            {post.mediaType === 'image' ? (
              <img
                src={post.mediaUrl}
                alt="Post media"
                className="w-full rounded-xl object-cover max-h-96"
              />
            ) : (
              <video
                src={post.mediaUrl}
                controls
                className="w-full rounded-xl max-h-96"
              >
                Your browser does not support the video tag.
              </video>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            {/* Like */}
            <button
              onClick={() => post.aiVerdict !== 'pending' && onLike(post.id)}
              disabled={post.aiVerdict === 'pending'}
              className={`flex items-center space-x-2 group ${
                post.aiVerdict === 'pending' ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Heart
                className={`h-5 w-5 transition-colors group-hover:text-red-500 ${
                  post.isLiked ? 'fill-red-500 text-red-500' : 'text-muted-foreground'
                }`}
              />
              <span className={`text-sm ${post.isLiked ? 'text-red-500' : 'text-muted-foreground'}`}>
                {post.likes}
              </span>
            </button>

            {/* Comment */}
            <Link
              to={`/app/post/${post.id}`}
              className="flex items-center space-x-2 group hover:text-primary"
            >
              <MessageCircle className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-sm text-muted-foreground group-hover:text-primary">
                {post.comments}
              </span>
            </Link>

            {/* Share */}
            <button
              onClick={() => onShare?.(post.id)}
              className="flex items-center space-x-2 group hover:text-green-500"
            >
              <Share className="h-5 w-5 text-muted-foreground group-hover:text-green-500 transition-colors" />
              <span className="text-sm text-muted-foreground group-hover:text-green-500">
                {post.shares}
              </span>
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PostCard;