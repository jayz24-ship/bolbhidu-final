import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { apiService } from '../utils/api';
import { getSocket } from '../utils/socket';
import { toast } from 'sonner';

export interface Post {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  userEmail: string;
  description: string;
  category: string;
  location: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  timestamp: Date | string; // Support both Date and string
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  isRegisteredAsIssue?: boolean;
  issueProgress?: number;
  issueStatus?: string;
  aiVerdict?: 'pending' | 'accepted' | 'rejected';
  aiScore?: number;
  // Trending-specific fields
  engagementScore?: number;
  trendingRank?: number;
  timeframe?: string;
  distance?: string;
  // Coordinates for post creation
  lat?: number;
  lng?: number;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  username: string;
  userAvatar: string;
  content: string;
  timestamp: Date;
}

interface PostContextType {
  posts: Post[];
  comments: Comment[];
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredPosts: Post[];
  createPost: (postData: Omit<Post, 'id' | 'timestamp' | 'likes' | 'comments' | 'shares' | 'isLiked' | 'isRegisteredAsIssue'>) => Promise<void>;
  likePost: (postId: string) => Promise<void>;
  addComment: (postId: string, content: string) => Promise<void>;
  getPostById: (postId: string) => Post | undefined;
  getCommentsByPostId: (postId: string) => Comment[];
  fetchPosts: () => Promise<void>;
  fetchComments: (postId: string) => Promise<void>;
  checkAndRegisterAsIssue: (postId: string) => void;
}

const PostContext = createContext<PostContextType | undefined>(undefined);

export const usePost = () => {
  const context = useContext(PostContext);
  if (context === undefined) {
    throw new Error('usePost must be used within a PostProvider');
  }
  return context;
};

interface PostProviderProps {
  children: ReactNode;
}

export const PostProvider: React.FC<PostProviderProps> = ({ children }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Don't fetch posts on mount - let the Feed page trigger it
  // This prevents 401 errors on public pages
  // useEffect(() => {
  //   fetchPosts();
  // }, []);

  // Listen for real-time events
  useEffect(() => {
    // Retry mechanism to wait for socket initialization
    let retryTimer: NodeJS.Timeout;
    
    const setupListeners = () => {
      const socket = getSocket();
      
      if (!socket) {
        console.log('[PostContext] Socket not ready yet, retrying in 500ms...');
        retryTimer = setTimeout(setupListeners, 500);
        return;
      }
      
      console.log('[PostContext] ✅ Socket ready! Setting up listeners');
      const userId = localStorage.getItem('user_id');
      console.log(`[PostContext] User ID: ${userId}`);

      const handlePostCreated = (data: any) => {
        console.log('[PostContext] New post created:', data);
      };

      const handleLikeUpdated = (data: any) => {
        console.log('[PostContext] Post likes updated:', data);
        setPosts(prev => prev.map(post => 
          post.id === data.postId 
            ? { ...post, likes: data.likes, isLiked: data.isLiked }
            : post
        ));
      };

      const handleCommentCreated = (data: any) => {
        console.log('[PostContext] New comment:', data);
        setPosts(prev => prev.map(post => 
          post.id === data.postId 
            ? { ...post, comments: post.comments + 1 }
            : post
        ));
      };

      const handlePostEscalated = (data: any) => {
        console.log('[PostContext] Post escalated:', data);
        setPosts(prev => prev.map(post => 
          post.id === data.postId 
            ? { ...post, isRegisteredAsIssue: true }
            : post
        ));
      };

      const handleAIResult = (data: any) => {
        console.log('[PostContext] ======= AI VALIDATION RESULT =======');
        console.log('[PostContext] Full data:', JSON.stringify(data, null, 2));
        console.log('[PostContext] Verdict:', data.aiVerdict);
        console.log('[PostContext] Post ID:', data.postId);
        
        const { postId, aiVerdict, reasons } = data;
        
        if (aiVerdict === 'rejected') {
          toast.error(
            'Your post was rejected by AI verification',
            {
              description: reasons && reasons.length > 0 
                ? reasons[0] 
                : 'Your post does not meet our community guidelines.',
              duration: 8000,
            }
          );
          setPosts(prev => prev.filter(post => post.id !== postId));
        } else if (aiVerdict === 'accepted') {
          setPosts(prev => prev.map(post => 
            post.id === postId 
              ? { ...post, aiVerdict: 'accepted' }
              : post
          ));
          toast.success('Your post has been verified and published!', {
            duration: 4000,
          });
        }
      };

      socket.on('feed.post.created', handlePostCreated);
      socket.on('post.like.updated', handleLikeUpdated);
      socket.on('post.comment.created', handleCommentCreated);
      socket.on('post.escalated', handlePostEscalated);
      socket.on('post.ai.result', handleAIResult);
      
      console.log('[PostContext] ✅ All socket listeners registered');
    };
    
    // Start setup
    setupListeners();
    
    return () => {
      clearTimeout(retryTimer);
      const socket = getSocket();
      if (socket) {
        socket.off('feed.post.created');
        socket.off('post.like.updated');
        socket.off('post.comment.created');
        socket.off('post.escalated');
        socket.off('post.ai.result');
        console.log('[PostContext] Socket listeners cleaned up');
      }
    };
  }, []);

  const createPost = async (postData: Omit<Post, 'id' | 'timestamp' | 'likes' | 'comments' | 'shares' | 'isLiked' | 'isRegisteredAsIssue'>) => {
    setIsLoading(true);
    try {
      // Upload media if present
      let mediaPublicId = '';
      let mediaType: 'image' | 'video' | undefined;

      if (postData.mediaUrl) {
        // Media URL is already uploaded via Cloudinary, extract publicId
        // For now, we'll send the full URL
        mediaPublicId = postData.mediaUrl;
        mediaType = postData.mediaType;
      }

      const response = await apiService.posts.createPost({
        description: postData.description,
        category: postData.category,
        location: postData.location,
        lat: postData.lat || 0, // Use passed coordinates or fallback
        lng: postData.lng || 0,
        media: mediaPublicId ? [{ publicId: mediaPublicId, type: mediaType || 'image' }] : []
      });

      const newPostId = response.data.id;
      console.log('[PostContext] Post created with ID:', newPostId, '- AI verifying...');
      
      // Add pending post to UI immediately
      const pendingPost: Post = {
        id: newPostId,
        userId: postData.userId,
        username: postData.username,
        userAvatar: postData.userAvatar,
        userEmail: postData.userEmail,
        description: postData.description,
        category: postData.category,
        location: postData.location,
        mediaUrl: postData.mediaUrl,
        mediaType: postData.mediaType,
        timestamp: new Date(),
        likes: 0,
        comments: 0,
        shares: 0,
        isLiked: false,
        aiVerdict: 'pending',
        isRegisteredAsIssue: false
      };
      
      setPosts(prev => [pendingPost, ...prev]);
      
      // Poll for AI result as fallback (in case socket doesn't work)
      let pollCount = 0;
      const maxPolls = 30; // 30 seconds max
      const pollInterval = setInterval(async () => {
        pollCount++;
        
        try {
          console.log(`[PostContext] Polling for post ${newPostId} status... (${pollCount}/${maxPolls})`);
          await fetchPosts(); // Refresh feed to get latest status
          
          const updatedPost = posts.find(p => p.id === newPostId);
          if (updatedPost && updatedPost.aiVerdict !== 'pending') {
            console.log('[PostContext] ✅ Post verified:', updatedPost.aiVerdict);
            clearInterval(pollInterval);
          } else if (pollCount >= maxPolls) {
            console.warn('[PostContext] ⏱️ Polling timeout - post may still be processing');
            clearInterval(pollInterval);
            toast.warning('Post is still being verified', {
              description: 'Refresh the page to see the latest status',
              duration: 5000
            });
          }
        } catch (error) {
          console.error('[PostContext] Poll error:', error);
        }
      }, 1000); // Poll every second
      
    } catch (error: any) {
      console.error('[PostContext] Create post error:', error);
      throw new Error(error.response?.data?.message || 'Failed to create post');
    } finally {
      setIsLoading(false);
    }
  };

  const likePost = async (postId: string) => {
    try {
      const post = posts.find(p => p.id === postId);
      if (!post) return;

      if (post.isLiked) {
        await apiService.posts.unlikePost(postId);
      } else {
        await apiService.posts.likePost(postId);
      }

      // Optimistic update
      setPosts(prev => prev.map(p => 
        p.id === postId 
          ? { ...p, likes: p.isLiked ? p.likes - 1 : p.likes + 1, isLiked: !p.isLiked }
          : p
      ));
    } catch (error: any) {
      console.error('[PostContext] Like post error:', error);
      throw new Error(error.response?.data?.message || 'Failed to like post');
    }
  };

  const addComment = async (postId: string, content: string) => {
    try {
      const response = await apiService.posts.addComment(postId, content);
      
      const newComment: Comment = {
        id: response.data.id || Date.now().toString(),
        postId,
        userId: response.data.userId || '',
        username: response.data.username || 'User',
        userAvatar: response.data.userAvatar || '',
        content,
        timestamp: new Date()
      };

      setComments(prev => [...prev, newComment]);
      
      // Update post comment count
      setPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, comments: post.comments + 1 }
          : post
      ));
    } catch (error: any) {
      console.error('[PostContext] Add comment error:', error);
      throw new Error(error.response?.data?.message || 'Failed to add comment');
    }
  };

  const fetchPosts = async () => {
    setIsLoading(true);
    try {
      // Get user location if available
      let lat, lng;
      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 5000,
              enableHighAccuracy: false
            });
          });
          lat = position.coords.latitude;
          lng = position.coords.longitude;
          console.log('[PostContext] Location detected:', lat, lng);
        } catch (geoError) {
          console.warn('[PostContext] Geolocation failed, fetching all posts:', geoError);
          // Continue without location - backend will return all posts
        }
      }

      const response = await apiService.posts.getFeed(1, 20, lat, lng);
      const fetchedPosts = response.data.posts.map((post: any) => ({
        ...post,
        timestamp: new Date(post.timestamp)
      }));
      
      console.log('[PostContext] Fetched posts:', fetchedPosts.length);
      setPosts(fetchedPosts);
    } catch (error: any) {
      console.error('[PostContext] Fetch posts error:', error);
      // Set empty array on error
      setPosts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getPostById = (postId: string): Post | undefined => {
    return posts.find(post => post.id === postId);
  };

  const getCommentsByPostId = (postId: string): Comment[] => {
    return comments.filter(comment => comment.postId === postId);
  };

  const fetchComments = async (postId: string) => {
    try {
      const response = await apiService.posts.getComments(postId);
      const fetchedComments = response.data.map((comment: any) => ({
        id: comment._id || comment.id,
        postId,
        userId: comment.userId,
        username: comment.username || 'User',
        userAvatar: comment.userAvatar || '',
        content: comment.content,
        timestamp: new Date(comment.createdAt || comment.timestamp)
      }));
      
      // Update comments state
      setComments(prev => {
        // Remove old comments for this post and add new ones
        const filtered = prev.filter(c => c.postId !== postId);
        return [...filtered, ...fetchedComments];
      });
    } catch (error) {
      console.error('[PostContext] Fetch comments error:', error);
    }
  };

  const checkAndRegisterAsIssue = (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const engagementScore = post.likes + (post.comments * 3) + (post.shares * 2);
    
    if (engagementScore >= 50 && !post.isRegisteredAsIssue) {
      setPosts(prev => prev.map(p => 
        p.id === postId 
          ? { ...p, isRegisteredAsIssue: true }
          : p
      ));
      
      console.log(`[PostContext] Post ${postId} registered as issue (score: ${engagementScore})`);
    }
  };

  // Filter posts based on search query
  const filteredPosts = React.useMemo(() => {
    if (!searchQuery.trim()) {
      return posts;
    }
    
    const query = searchQuery.toLowerCase();
    return posts.filter(post => 
      post.description.toLowerCase().includes(query) ||
      post.category.toLowerCase().includes(query) ||
      post.location.toLowerCase().includes(query) ||
      post.username.toLowerCase().includes(query)
    );
  }, [posts, searchQuery]);

  const value: PostContextType = {
    posts,
    comments,
    isLoading,
    searchQuery,
    setSearchQuery,
    filteredPosts,
    createPost,
    likePost,
    addComment,
    getPostById,
    getCommentsByPostId,
    fetchPosts,
    fetchComments,
    checkAndRegisterAsIssue,
  };

  return <PostContext.Provider value={value}>{children}</PostContext.Provider>;
};
