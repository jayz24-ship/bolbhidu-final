import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../utils/api';
import PostCard from '../components/PostCard';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { TrendingUp, Clock, MapPin, BarChart3, Flame, ArrowUp, Activity } from 'lucide-react';
import { toast } from 'sonner';

interface TrendingPost {
  id: string;
  userId: string;
  username: string;
  userAvatar: string;
  userEmail: string;
  description: string;
  category: string;
  location: string;
  mediaUrl: string;
  mediaType: string;
  timestamp: string;
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  isRegisteredAsIssue: boolean;
  engagementScore: number;
  trendingRank: number;
  timeframe: string;
  distance?: string;
  issueProgress?: number;
  issueStatus?: string;
}

interface TrendingCategory {
  category: string;
  displayName: string;
  stats: {
    totalPosts: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    totalEngagement: number;
    avgEngagement: number;
    trendingScore: number;
  };
  latestActivity: string;
  trend: 'hot' | 'rising' | 'stable' | 'quiet';
}

const Trending: React.FC = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<TrendingPost[]>([]);
  const [categories, setCategories] = useState<TrendingCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'1d' | '7d' | '30d'>('7d');
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalTrendingPosts, setTotalTrendingPosts] = useState(0);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Get user location
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.warn('Location access denied:', error);
          // Continue without location - will show global trending
        }
      );
    }
  }, []);

  // Fetch trending posts
  const fetchTrendingPosts = async (pageNum = 1, reset = false) => {
    try {
      setLoading(pageNum === 1);

      const response = await apiService.posts.getTrendingPosts(
        pageNum,
        10,
        timeframe,
        userLocation?.lat,
        userLocation?.lng,
        25
      );
      const { items, hasMore: moreAvailable, meta } = response.data;

      if (reset || pageNum === 1) {
        setPosts(items);
        setPage(1);
      } else {
        setPosts(prev => [...prev, ...items]);
      }
      
      setHasMore(moreAvailable);
      setTotalTrendingPosts(meta.totalTrendingPosts);
    } catch (error) {
      console.error('Error fetching trending posts:', error);
      toast.error('Failed to load trending posts');
    } finally {
      setLoading(false);
    }
  };

  // Fetch trending categories
  const fetchTrendingCategories = async () => {
    try {
      setCategoriesLoading(true);

      const response = await apiService.posts.getTrendingCategories(
        timeframe,
        userLocation?.lat,
        userLocation?.lng,
        25
      );
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Error fetching trending categories:', error);
      toast.error('Failed to load category trends');
    } finally {
      setCategoriesLoading(false);
    }
  };

  // Load data when component mounts or dependencies change
  useEffect(() => {
    if (userLocation !== undefined) { // Wait for location check to complete
      fetchTrendingPosts(1, true);
      fetchTrendingCategories();
    }
  }, [timeframe, userLocation]);

  const handleTimeframeChange = (newTimeframe: '1d' | '7d' | '30d') => {
    setTimeframe(newTimeframe);
    setPage(1);
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchTrendingPosts(nextPage, false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'hot': return <Flame className="h-4 w-4 text-red-500" />;
      case 'rising': return <ArrowUp className="h-4 w-4 text-green-500" />;
      case 'stable': return <Activity className="h-4 w-4 text-blue-500" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'hot': return 'bg-red-100 text-red-800 border-red-200';
      case 'rising': return 'bg-green-100 text-green-800 border-green-200';
      case 'stable': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Trending Issues
          </h1>
          <p className="text-muted-foreground mt-1">
            {userLocation 
              ? `Discover what's trending in your area (within 25km)`
              : 'Discover what\'s trending globally'
            }
          </p>
        </div>
        
        {/* Location indicator */}
        {userLocation && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>Near you • {totalTrendingPosts} trending</span>
          </div>
        )}
      </div>

      {/* Timeframe selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Timeframe:</span>
        <div className="flex gap-1">
          {['1d', '7d', '30d'].map((tf) => (
            <Button
              key={tf}
              size="sm"
              variant={timeframe === tf ? 'default' : 'outline'}
              onClick={() => handleTimeframeChange(tf as '1d' | '7d' | '30d')}
            >
              {tf === '1d' ? 'Today' : tf === '7d' ? 'This Week' : 'This Month'}
            </Button>
          ))}
        </div>
      </div>

      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="posts">Trending Posts</TabsTrigger>
          <TabsTrigger value="categories">Category Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Trending Issues</h3>
                <p className="text-muted-foreground">
                  There are no trending issues in your area for the selected timeframe.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="space-y-4">
                {posts.map((post, index) => (
                  <div key={post.id} className="relative">
                    {/* Trending rank badge */}
                    <div className="absolute top-4 left-4 z-10">
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        #{post.trendingRank}
                      </Badge>
                    </div>
                    
                    {/* Distance badge */}
                    {post.distance && (
                      <div className="absolute top-4 right-4 z-10">
                        <Badge variant="outline" className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {post.distance}
                        </Badge>
                      </div>
                    )}

                    <PostCard
                      post={post}
                      onLike={() => {}} // Will be handled by PostCard internally
                      onComment={() => {}} // Will be handled by PostCard internally
                      onSave={() => {}} // Will be handled by PostCard internally
                      showEngagement={true}
                    />
                    
                    {/* Trending stats */}
                    <div className="mt-2 px-4 py-2 bg-muted/50 rounded-b-lg">
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Engagement Score: {post.engagementScore}</span>
                        <span className="flex items-center gap-1">
                          <BarChart3 className="h-3 w-3" />
                          {post.likes + post.comments + post.shares} interactions
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Load more button */}
              {hasMore && (
                <div className="text-center pt-4">
                  <Button 
                    onClick={loadMore} 
                    disabled={loading}
                    variant="outline"
                  >
                    {loading ? 'Loading...' : 'Load More Trending Posts'}
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          {categoriesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
                    <div className="space-y-2">
                      <div className="h-3 bg-muted rounded w-full"></div>
                      <div className="h-3 bg-muted rounded w-2/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : categories.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Category Data</h3>
                <p className="text-muted-foreground">
                  No category insights available for the selected timeframe.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => (
                <Card key={category.category} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{category.displayName}</CardTitle>
                      <div className="flex items-center gap-1">
                        {getTrendIcon(category.trend)}
                        <Badge 
                          variant="outline" 
                          className={getTrendColor(category.trend)}
                        >
                          {category.trend}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Posts</p>
                        <p className="font-semibold">{category.stats.totalPosts}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Engagement</p>
                        <p className="font-semibold">{category.stats.totalEngagement}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Avg Score</p>
                        <p className="font-semibold">{category.stats.avgEngagement}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Interactions</p>
                        <p className="font-semibold">
                          {category.stats.totalLikes + category.stats.totalComments + category.stats.totalShares}
                        </p>
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">
                        Latest activity: {new Date(category.latestActivity).toLocaleDateString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Trending;