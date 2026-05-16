import React, { useState, useEffect } from 'react';
import { Plus, Search } from 'lucide-react';
import { usePost } from '../contexts/PostContext';
import { apiService } from '../utils/api';
import PostCard from '../components/PostCard';
import CreatePostModal from '../components/CreatePostModal';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';

const Feed: React.FC = () => {
  const { posts, filteredPosts, searchQuery, setSearchQuery, likePost, fetchPosts, isLoading } = usePost();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    const loadFeed = async () => {
      try {
        await fetchPosts();
      } catch (error) {
        toast.error('Failed to load posts');
      } finally {
        setIsInitialLoad(false);
      }
    };

    loadFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const handleLike = (postId: string) => {
    likePost(postId);
  };

  const handleShare = (postId: string) => {
    // Mock share functionality
    navigator.clipboard.writeText(`${window.location.origin}/post/${postId}`);
    toast.success('Post link copied to clipboard!');
  };

  const handleSave = async (postId: string) => {
    try {
      await apiService.posts.savePost(postId);
      toast.success('Post saved successfully!');
    } catch (error: any) {
      toast.error('Failed to save post');
    }
  };

  const handleDelete = async (postId: string) => {
    if (!window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    try {
      await apiService.posts.deletePost(postId);
      toast.success('Post deleted successfully!');
      // Refresh the feed
      await fetchPosts();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to delete post');
    }
  };

  if (isInitialLoad) {
    return (
      <div className="space-y-6">
        {/* Loading skeletons */}
        {[...Array(3)].map((_, index) => (
          <div key={index} className="bg-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center space-x-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-48 w-full rounded-xl" />
            <div className="flex space-x-4">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-8 w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-card rounded-2xl p-6 shadow-sm">
        <h1 className="text-2xl font-bold mb-2">Welcome to your community feed</h1>
        <p className="text-muted-foreground">
          Discover what's happening in your area and help make your community better.
        </p>
      </div>

      {/* Info Card about Issue Registration */}
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-2xl p-6 shadow-sm border border-primary/20">
        <h2 className="font-semibold mb-2">🎯 How Posts Become Issues</h2>
        <p className="text-sm text-muted-foreground mb-3">
          When a post receives enough community engagement, it automatically gets registered as an official issue on the admin dashboard!
        </p>
        <div className="space-y-1 text-sm">
          <p>📊 <span className="font-medium">Engagement Formula:</span> Likes + (Comments × 2) + (Shares × 3)</p>
          <p>🎯 <span className="font-medium">Threshold:</span> 20 engagement points to register as an issue</p>
          <p>⚠️ <span className="font-medium">Note:</span> Users with 5+ reports are suspended for 10 days</p>
        </div>
      </div>

      {/* Posts Feed */}
      <div className="space-y-6">
        {filteredPosts.length === 0 && searchQuery ? (
          <div className="bg-card rounded-2xl p-12 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <div className="bg-muted rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">No results found</h3>
              <p className="text-muted-foreground">
                No posts match your search query "{searchQuery}"
              </p>
              <Button variant="outline" onClick={() => setSearchQuery('')}>
                Clear Search
              </Button>
            </div>
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-card rounded-2xl p-12 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <div className="bg-muted rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                <Plus className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">No posts yet</h3>
              <p className="text-muted-foreground">
                Be the first to share something with your community!
              </p>
              <Button onClick={() => setIsCreateModalOpen(true)}>
                Create First Post
              </Button>
            </div>
          </div>
        ) : (
          filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onLike={handleLike}
              onShare={handleShare}
              onSave={handleSave}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>

      {/* Load More Button */}
      {posts.length > 0 && (
        <div className="text-center py-8">
          <Button variant="outline" onClick={fetchPosts} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Load More Posts'}
          </Button>
        </div>
      )}

      {/* Floating Create Post Button */}
      <Button
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow z-50"
        size="icon"
        onClick={() => setIsCreateModalOpen(true)}
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
};

export default Feed;