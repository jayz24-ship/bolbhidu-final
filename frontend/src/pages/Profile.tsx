import React, { useState, useRef, useEffect } from 'react';
import { Camera, MapPin, Calendar, Edit2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePost } from '../contexts/PostContext';
import { apiService } from '../utils/api';
import PostCard from '../components/PostCard';
import { Button } from '../components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

const Profile: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const { posts, likePost } = usePost();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [savedPosts, setSavedPosts] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editForm, setEditForm] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    location: user?.location || '',
  });

  // Filter posts by current user
  const userPosts = posts.filter(post => post.userId === user?.id);
  
  // Filter liked posts
  const likedPosts = posts.filter(post => post.isLiked);

  // Fetch saved posts
  useEffect(() => {
    const fetchSavedPosts = async () => {
      try {
        const response = await apiService.posts.getSavedPosts();
        const posts = (response.data.items || []).map((post: any) => ({
          ...post,
          timestamp: new Date(post.timestamp)
        }));
        setSavedPosts(posts);
      } catch (error) {
        console.error('Failed to fetch saved posts:', error);
      }
    };
    fetchSavedPosts();
  }, []);

  const handleLike = (postId: string) => {
    likePost(postId);
  };

  const handleShare = (postId: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/post/${postId}`);
    toast.success('Post link copied to clipboard!');
  };

  const handleSave = async (postId: string) => {
    try {
      const isSaved = savedPosts.some(p => p.id === postId);
      if (isSaved) {
        await apiService.posts.unsavePost(postId);
        setSavedPosts(prev => prev.filter(p => p.id !== postId));
        toast.success('Post removed from saved');
      } else {
        await apiService.posts.savePost(postId);
        const post = posts.find(p => p.id === postId);
        if (post) {
          setSavedPosts(prev => [post, ...prev]);
        }
        toast.success('Post saved successfully!');
      }
    } catch (error: any) {
      toast.error('Failed to save post');
    }
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let avatarUrl = user?.avatar;

      // Upload avatar if changed
      if (avatarFile) {
        console.log('[Profile] Uploading avatar...');
        toast.info('Uploading avatar...');
        const uploadResult = await apiService.upload.image(avatarFile);
        avatarUrl = uploadResult.data.url;
        console.log('[Profile] Avatar uploaded:', avatarUrl);
      }

      // Update profile
      console.log('[Profile] Updating profile with:', {
        name: editForm.name,
        bio: editForm.bio,
        location: editForm.location,
        avatar: avatarUrl ? 'provided' : 'not provided'
      });
      
      await updateProfile({
        name: editForm.name,
        bio: editForm.bio,
        location: editForm.location,
        avatar: avatarUrl,
      });

      console.log('[Profile] Update successful');
      toast.success('Profile updated successfully!');
      setIsEditModalOpen(false);
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (error: any) {
      console.error('[Profile] Update failed:', error);
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setEditForm({
      ...editForm,
      [e.target.name]: e.target.value,
    });
  };

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card className="rounded-2xl shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-start space-y-4 md:space-y-0 md:space-x-6">
            {/* Avatar */}
            <div className="relative">
              <Avatar className="h-32 w-32">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="text-2xl">{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <Button
                size="icon"
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full"
                variant="secondary"
                onClick={handleAvatarClick}
                type="button"
              >
                <Camera className="h-4 w-4" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold">{user.name}</h1>
                  <p className="text-muted-foreground">@{user.name.toLowerCase().replace(' ', '')}</p>
                </div>
                
                <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="mt-2 sm:mt-0">
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Edit Profile</DialogTitle>
                      <DialogDescription>
                        Update your profile information below.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleEditSubmit} className="space-y-4">
                      {/* Avatar Preview */}
                      {avatarPreview && (
                        <div className="flex justify-center">
                          <Avatar className="h-24 w-24">
                            <AvatarImage src={avatarPreview} alt="New avatar" />
                          </Avatar>
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          name="name"
                          value={editForm.name}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bio">Bio</Label>
                        <Textarea
                          id="bio"
                          name="bio"
                          placeholder="Tell us about yourself..."
                          value={editForm.bio}
                          onChange={handleInputChange}
                          rows={3}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          name="location"
                          placeholder="Where are you located?"
                          value={editForm.location}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)} disabled={isSubmitting}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Bio */}
              {user.bio && (
                <p className="text-foreground mb-4">{user.bio}</p>
              )}

              {/* Meta Info */}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                {user.location && (
                  <div className="flex items-center space-x-1">
                    <MapPin className="h-4 w-4" />
                    <span>{user.location}</span>
                  </div>
                )}
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>Joined October 2024</span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex space-x-6">
                <div className="text-center">
                  <div className="font-bold text-lg">{userPosts.length}</div>
                  <div className="text-sm text-muted-foreground">Posts</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Tabs */}
      <Tabs defaultValue="posts" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="liked">Liked</TabsTrigger>
          <TabsTrigger value="saved">Saved</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-6">
          <div className="space-y-6">
            {userPosts.length === 0 ? (
              <Card className="rounded-2xl shadow-sm">
                <CardContent className="p-12 text-center">
                  <div className="max-w-md mx-auto space-y-4">
                    <div className="bg-muted rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                      <Edit2 className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold">No posts yet</h3>
                    <p className="text-muted-foreground">
                      You haven't shared anything with the community yet. Create your first post!
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              userPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onLike={handleLike}
                  onShare={handleShare}
                  onSave={handleSave}
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="liked" className="mt-6">
          <div className="space-y-4">
            {likedPosts.length === 0 ? (
              <Card className="rounded-2xl shadow-sm">
                <CardContent className="p-12 text-center">
                  <div className="max-w-md mx-auto space-y-4">
                    <div className="bg-muted rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                      <Badge className="h-8 w-8" />
                    </div>
                    <h3 className="text-lg font-semibold">No liked posts</h3>
                    <p className="text-muted-foreground">
                      Posts you like will appear here.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              likedPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onLike={handleLike}
                  onShare={handleShare}
                  onSave={handleSave}
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="saved" className="mt-6">
          <div className="space-y-4">
            {savedPosts.length === 0 ? (
              <Card className="rounded-2xl shadow-sm">
                <CardContent className="p-12 text-center">
                  <div className="max-w-md mx-auto space-y-4">
                    <div className="bg-muted rounded-full w-16 h-16 flex items-center justify-center mx-auto">
                      <Badge className="h-8 w-8" />
                    </div>
                    <h3 className="text-lg font-semibold">No saved posts</h3>
                    <p className="text-muted-foreground">
                      Posts you save will appear here.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              savedPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onLike={handleLike}
                  onShare={handleShare}
                  onSave={handleSave}
                />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Profile;