import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useStreak } from '@/hooks/useStreak';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { PostUpload } from '@/components/PostUpload';
import { PostImageCarousel } from '@/components/PostImageCarousel';
import { CommentSection } from '@/components/CommentSection';
import { UsersList } from '@/components/UsersList';
import { FollowButton } from '@/components/FollowButton';
import { useToast } from '@/hooks/use-toast';
import { Calendar, Heart, MessageCircle, Trash2, Users, UserPlus, Flame, Trophy, Award, Target, Zap, Search, Lock, Settings, CheckCircle, XCircle, SkipForward, BarChart2 } from 'lucide-react';
import { useMutualFollow } from '@/hooks/useMutualFollow';

interface Post {
  id: string;
  content: string;
  image_url?: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  tags: string[];
  images?: { id: string; file_url: string }[];
}


interface Profile {
  id: string;
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  followers_count: number;
  following_count: number;
}

interface Achievement {
  id: number;
  title: string;
  description: string;
  icon: string;
  earnedAt: string;
  category: string;
}

export const Profile = () => {
  const { userId } = useParams<{ userId?: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const { streak } = useStreak();
  const [posts, setPosts] = useState<Post[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [followers, setFollowers] = useState<string[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lightboxPostId, setLightboxPostId] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [isQuizHistoryOpen, setIsQuizHistoryOpen] = useState(false);
  const [quizHistory, setQuizHistory] = useState<any[]>([]);
  const [quizHistoryLoading, setQuizHistoryLoading] = useState(false);
  
  const [achievements] = useState<Achievement[]>([
    {
      id: 1,
      title: "Welcome!",
      description: "Joined the community",
      icon: "Trophy",
      earnedAt: "2024-01-01",
      category: "milestone",
    },
    {
      id: 2,
      title: "First Post",
      description: "Shared your first post",
      icon: "Heart",
      earnedAt: "2024-01-02",
      category: "engagement",
    },
    {
      id: 3,
      title: "Consistent Creator",
      description: "Posted for 5 days in a row",
      icon: "Flame",
      earnedAt: "2024-01-07",
      category: "consistency",
    },
  ]);

  const profileUserId = userId || user?.id;
  const isOwnProfile = !userId || userId === user?.id;

  // Mutual follow check — own profile is always "open"
  const { isMutual, isLoading: isMutualLoading } = useMutualFollow(
    isOwnProfile ? undefined : profileUserId
  );

  useEffect(() => {
    if (profileUserId) {
      fetchProfile();
      fetchPosts();
      fetchFollowers();
      fetchFollowing();
    }
  }, [profileUserId]);

  const fetchProfile = async () => {
    if (!profileUserId) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', profileUserId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return;
      }

      if (!data) {
        // Only auto-create a profile for the currently logged-in user
        if (!user) return;
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            user_id: profileUserId,
            username: user.email?.split('@')[0] || 'Anonymous',
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating profile:', createError);
          return;
        }

        setProfile(newProfile);
      } else {
        setProfile(data);
        setEditUsername(data.username || '');
        setEditBio(data.bio || '');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleUpdateProfile = async () => {
    if (!user || !profile) return;

    setIsUpdating(true);
    try {
      let avatarUrl = profile.avatar_url;

      // Upload avatar if a new file is selected
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('profile-images')
          .upload(filePath, avatarFile, {
            upsert: true
          });

        if (uploadError) {
          console.error('Error uploading avatar:', uploadError);
          toast({
            title: 'Error',
            description: 'Failed to upload profile picture',
            variant: 'destructive',
          });
          setIsUpdating(false);
          return;
        }

        const { data: urlData } = supabase.storage
          .from('profile-images')
          .getPublicUrl(filePath);

        avatarUrl = urlData.publicUrl;
      }

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          username: editUsername,
          bio: editBio,
          avatar_url: avatarUrl,
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating profile:', updateError);
        toast({
          title: 'Error',
          description: 'Failed to update profile',
          variant: 'destructive',
        });
        setIsUpdating(false);
        return;
      }

      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      });

      setIsEditDialogOpen(false);
      setAvatarFile(null);
      fetchProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const fetchFollowers = async () => {
    if (!profileUserId) return;

    try {
      const { data, error } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('followed_id', profileUserId);

      if (error) {
        console.error('Error fetching followers:', error);
        return;
      }

      setFollowers(data?.map(f => f.follower_id) || []);
    } catch (error) {
      console.error('Error fetching followers:', error);
    }
  };

  const fetchFollowing = async () => {
    if (!profileUserId) return;

    try {
      const { data, error } = await supabase
        .from('follows')
        .select('followed_id')
        .eq('follower_id', profileUserId);

      if (error) {
        console.error('Error fetching following:', error);
        return;
      }

      setFollowing(data?.map(f => f.followed_id) || []);
    } catch (error) {
      console.error('Error fetching following:', error);
    }
  };

  const fetchPosts = async () => {
    if (!profileUserId) return;

    try {
      const { data: postsData, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', profileUserId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching posts:', error);
        return;
      }

      const basePosts = postsData || [];

      // Fetch all images for these posts in one query
      const postIds = basePosts.map((p) => p.id);
      let imagesByPost = new Map<string, { id: string; file_url: string }[]>();

      if (postIds.length > 0) {
        const { data: imagesData, error: imagesError } = await supabase
          .from('post_images')
          .select('id, post_id, file_url, position')
          .in('post_id', postIds)
          .order('position', { ascending: true });

        if (imagesError) {
          console.error('Error fetching post images:', imagesError);
        } else {
          imagesByPost = new Map();
          (imagesData || []).forEach((img: any) => {
            const arr = imagesByPost.get(img.post_id) || [];
            arr.push({ id: img.id, file_url: img.file_url });
            imagesByPost.set(img.post_id, arr);
          });
        }
      }

      const postsWithImages: Post[] = basePosts.map((post: any) => ({
        ...post,
        images: imagesByPost.get(post.id) || [],
      }));

      setPosts(postsWithImages);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setIsLoading(false);
    }
  };


  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', `%${query}%`)
        .neq('user_id', user?.id || '')
        .limit(10);

      if (error) {
        console.error('Error searching users:', error);
        return;
      }

      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    searchUsers(query);
  };

  const deletePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) {
        console.error('Error deleting post:', error);
        toast({
          title: 'Error',
          description: 'Failed to delete post',
          variant: 'destructive',
        });
        return;
      }

      setPosts(posts.filter(post => post.id !== postId));
      toast({
        title: 'Success',
        description: 'Post deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete post',
        variant: 'destructive',
      });
    }
  };

  const openLightbox = (postId: string, index: number) => {
    setLightboxPostId(postId);
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxPostId(null);
  };

  const showPrev = () => {
    const post = posts.find((p) => p.id === lightboxPostId);
    if (!post || !post.images || post.images.length === 0) return;
    setLightboxIndex((prev) =>
      prev === 0 ? post.images!.length - 1 : prev - 1
    );
  };

  const showNext = () => {
    const post = posts.find((p) => p.id === lightboxPostId);
    if (!post || !post.images || post.images.length === 0) return;
    setLightboxIndex((prev) =>
      prev === post.images!.length - 1 ? 0 : prev + 1
    );
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const diffX = e.changedTouches[0].clientX - touchStartX;
    const threshold = 50; // px
    if (diffX > threshold) {
      showPrev();
    } else if (diffX < -threshold) {
      showNext();
    }
    setTouchStartX(null);
  };


  const fetchQuizHistory = async () => {
    if (!user) return;
    setQuizHistoryLoading(true);
    const { data, error } = await supabase
      .from('quiz_performance_results' as any)
      .select('*')
      .eq('user_id', user.id)
      .order('completed_at', { ascending: false })
      .limit(50);
    if (!error) setQuizHistory(data ?? []);
    setQuizHistoryLoading(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center">
        <Card className="p-8">
          <CardContent>
            <p className="text-center text-muted-foreground">Please sign in to view your profile.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Profile Picture and Bio Section */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-6">
              <Avatar className="h-32 w-32 border-4 border-primary/20">
                <AvatarImage src={profile?.avatar_url || "/placeholder.svg"} />
                <AvatarFallback className="text-4xl">
                  {profile?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="text-center w-full max-w-md">
                <h1 className="text-3xl font-bold mb-2">
                  {profile?.username || user?.email?.split('@')[0] || 'Anonymous User'}
                </h1>
                <p className="text-muted-foreground mb-6">
                  {profile?.bio || 'No bio yet. Click edit to add one.'}
                </p>
                {isOwnProfile && (
                  <div className="flex flex-col items-center gap-3 w-full">
                  <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full max-w-xs">
                        Edit Profile
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Profile</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="username">Username</Label>
                          <Input
                            id="username"
                            value={editUsername}
                            onChange={(e) => setEditUsername(e.target.value)}
                            placeholder="Enter username"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="bio">Bio</Label>
                          <Textarea
                            id="bio"
                            value={editBio}
                            onChange={(e) => setEditBio(e.target.value)}
                            placeholder="Tell us about yourself"
                            rows={4}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="avatar">Profile Picture</Label>
                          <div className="flex items-center gap-4">
                            <Input
                              id="avatar"
                              type="file"
                              accept="image/*"
                              onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                            />
                            {avatarFile && (
                              <span className="text-sm text-muted-foreground">
                                {avatarFile.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button 
                          onClick={handleUpdateProfile} 
                          disabled={isUpdating}
                          className="w-full"
                        >
                          {isUpdating ? 'Updating...' : 'Save Changes'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Quiz History Button */}
                  <Dialog open={isQuizHistoryOpen} onOpenChange={(open) => { setIsQuizHistoryOpen(open); if (open) fetchQuizHistory(); }}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full max-w-xs flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Quiz Analysis History
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <BarChart2 className="h-5 w-5" />
                          Quiz Analysis History
                        </DialogTitle>
                      </DialogHeader>
                      {quizHistoryLoading ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
                      ) : quizHistory.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">No quiz history yet. Complete a quiz to see your results here.</p>
                      ) : (
                        <div className="space-y-4 py-2">
                          {quizHistory.map((result: any) => {
                            const ai = result.ai_analysis;
                            return (
                              <div key={result.id} className="rounded-lg border p-4 space-y-3">
                                {/* Header */}
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className="font-semibold text-sm">{result.deck_name}</p>
                                    <p className="text-xs text-muted-foreground">{result.category} · {new Date(result.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                  </div>
                                  <span className={`text-lg font-bold ${Number(result.score) >= 70 ? 'text-green-600' : Number(result.score) >= 40 ? 'text-orange-500' : 'text-red-500'}`}>
                                    {Number(result.score).toFixed(1)}%
                                  </span>
                                </div>

                                {/* Score breakdown */}
                                <div className="flex gap-4 text-xs">
                                  <span className="flex items-center gap-1 text-green-600">
                                    <CheckCircle className="h-3 w-3" /> {result.correct_count} correct
                                  </span>
                                  <span className="flex items-center gap-1 text-red-500">
                                    <XCircle className="h-3 w-3" /> {result.wrong_count} wrong
                                  </span>
                                  <span className="flex items-center gap-1 text-muted-foreground">
                                    <SkipForward className="h-3 w-3" /> {result.skipped_count} skipped
                                  </span>
                                  <span className="text-muted-foreground ml-auto">{result.total_count} total</span>
                                </div>

                                {/* AI Analysis */}
                                {ai ? (
                                  <div className="bg-muted/40 rounded-lg p-3 space-y-2 text-xs">
                                    <p className="font-semibold text-sm flex items-center gap-1">
                                      <BarChart2 className="h-3.5 w-3.5 text-primary" /> AI Analysis
                                      {ai.overall_trend && (
                                        <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-medium ${
                                          ai.overall_trend === 'improving' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' :
                                          ai.overall_trend === 'declining' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' :
                                          'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
                                        }`}>
                                          {ai.overall_trend.replace('_', ' ')}
                                        </span>
                                      )}
                                    </p>
                                    {ai.performance_summary && (
                                      <p className="text-muted-foreground">{ai.performance_summary}</p>
                                    )}
                                    {ai.weak_areas?.length > 0 && (
                                      <div>
                                        <p className="font-medium text-red-600 dark:text-red-400 mb-1">Weak areas</p>
                                        <div className="flex flex-wrap gap-1">
                                          {ai.weak_areas.map((a: string, i: number) => (
                                            <span key={i} className="px-2 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">{a}</span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {ai.strong_areas?.length > 0 && (
                                      <div>
                                        <p className="font-medium text-green-600 dark:text-green-400 mb-1">Strong areas</p>
                                        <div className="flex flex-wrap gap-1">
                                          {ai.strong_areas.map((a: string, i: number) => (
                                            <span key={i} className="px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">{a}</span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {ai.improvement_tips?.length > 0 && (
                                      <div>
                                        <p className="font-medium mb-1">Tips</p>
                                        <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                                          {ai.improvement_tips.map((tip: string, i: number) => (
                                            <li key={i}>{tip}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    )}
                                    {ai.comparison_note && (
                                      <p className="text-muted-foreground italic">{ai.comparison_note}</p>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-xs text-muted-foreground italic">No AI analysis saved for this attempt.</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </DialogContent>
                  </Dialog>
                  </div>
                )}
                {!isOwnProfile && profileUserId && (
                  <FollowButton targetUserId={profileUserId} />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Stats */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-6 justify-center">
              <div className="text-center">
                <div className="font-bold text-lg">{posts.length}</div>
                <div className="text-sm text-muted-foreground">Posts</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-lg">{profile?.followers_count || 0}</div>
                <div className="text-sm text-muted-foreground">Followers</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-lg">{profile?.following_count || 0}</div>
                <div className="text-sm text-muted-foreground">Following</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <div className="relative">
                    <Flame className="w-6 h-6 text-orange-500" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-primary-foreground">{streak}</span>
                    </div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">Streak</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Streak Statistics Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              Streak Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center p-6 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/50 rounded-lg">
                <div className="flex items-center justify-center mb-3">
                  <Zap className="w-12 h-12 text-orange-600" />
                </div>
                <p className="text-4xl font-bold text-orange-600 mb-2">{streak}</p>
                <p className="text-sm text-muted-foreground">Current Streak</p>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 rounded-lg">
                <div className="flex items-center justify-center mb-3">
                  <Target className="w-12 h-12 text-blue-600" />
                </div>
                <p className="text-4xl font-bold text-blue-600 mb-2">{streak}</p>
                <p className="text-sm text-muted-foreground">Best Streak</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* User Search Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search for users by username..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="pl-10"
                />
              </div>
              
              {isSearching && (
                <p className="text-sm text-muted-foreground">Searching...</p>
              )}
              
              {searchResults.length > 0 && (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {searchResults.map((userProfile) => (
                    <div key={userProfile.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={userProfile.avatar_url || "/placeholder.svg"} />
                          <AvatarFallback>
                            {userProfile.username?.[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{userProfile.username || 'Anonymous'}</p>
                          {userProfile.bio && (
                            <p className="text-sm text-muted-foreground truncate max-w-48">
                              {userProfile.bio}
                            </p>
                          )}
                        </div>
                      </div>
                      <FollowButton targetUserId={userProfile.user_id} />
                    </div>
                  ))}
                </div>
              )}
              
              {searchQuery && !isSearching && searchResults.length === 0 && (
                <p className="text-sm text-muted-foreground">No users found matching "{searchQuery}"</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Content Sections */}
        <Tabs defaultValue="posts" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="followers">Followers</TabsTrigger>
            <TabsTrigger value="following">Following</TabsTrigger>
          </TabsList>
          
          <TabsContent value="posts" className="space-y-6">
            {/* Lock posts for non-mutual follows when viewing another user's profile */}
            {!isOwnProfile && !isMutual && !isMutualLoading ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
                  <div className="rounded-full bg-muted p-4">
                    <Lock className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-base">Posts are private</p>
                    <p className="mt-1 text-sm text-muted-foreground max-w-xs">
                      Follow each other to see{' '}
                      <span className="font-medium text-foreground">
                        {profile?.username || 'this user'}
                      </span>
                      's posts.
                    </p>
                  </div>
                  {profileUserId && <FollowButton targetUserId={profileUserId} />}
                </CardContent>
              </Card>
            ) : (
            <>
            {isOwnProfile && <PostUpload onPostCreated={fetchPosts} />}
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Recent Posts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p>Loading posts...</p>
                ) : posts.length === 0 ? (
                  <p className="text-muted-foreground">No posts yet. Create your first post above!</p>
                ) : (
                  <div className="space-y-6">
                    {posts.map((post) => (
                      <div key={post.id} className="border-b pb-6 last:border-b-0">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-3">
                            <Link to={`/profile/${profileUserId}`} className="flex-shrink-0">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={profile?.avatar_url || undefined} />
                                <AvatarFallback>
                                  {profile?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                            </Link>
                            <div>
                              <Link
                                to={`/profile/${profileUserId}`}
                                className="font-medium text-sm hover:underline"
                              >
                                {profile?.username || user?.email?.split('@')[0] || 'Anonymous'}
                              </Link>
                              <p className="text-xs text-muted-foreground">
                                {new Date(post.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          {isOwnProfile && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deletePost(post.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        
                        <p className="text-sm mb-3">{post.content}</p>

                        {(() => {
                          const hasGalleryImages = !!(post.images && post.images.length);
                          const gallery =
                            (post.images?.map((img) => img.file_url) ?? []).concat(
                              !hasGalleryImages && post.image_url ? [post.image_url] : []
                            );
                          if (gallery.length === 0) return null;
                          return (
                            <div className="mb-4">
                              <PostImageCarousel
                                images={gallery}
                                onImageClick={
                                  hasGalleryImages
                                    ? (idx) => openLightbox(post.id, idx)
                                    : undefined
                                }
                              />
                            </div>
                          );
                        })()}
                        
                        {post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {post.tags.map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Heart className="h-4 w-4" />
                            {post.likes_count}
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageCircle className="h-4 w-4" />
                            {post.comments_count}
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t">
                          <CommentSection
                            postId={post.id}
                            commentsCount={post.comments_count}
                            onCommentChange={(newCount) =>
                              setPosts((prevPosts) =>
                                prevPosts.map((p) =>
                                  p.id === post.id ? { ...p, comments_count: newCount } : p
                                )
                              )
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            </>
            )}
          </TabsContent>

          <TabsContent value="followers">
            <UsersList title="Followers" userIds={followers} />
          </TabsContent>

          <TabsContent value="following">
            <UsersList title="Following" userIds={following} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Fullscreen lightbox for this profile's post images */}
      {lightboxPostId && (() => {
        const post = posts.find((p) => p.id === lightboxPostId);
        if (!post || !post.images || post.images.length === 0) return null;
        const currentImage = post.images[lightboxIndex];
        if (!currentImage) return null;

        return (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
            <button
              type="button"
              className="absolute top-4 right-4 text-white text-xl md:text-2xl"
              onClick={closeLightbox}
            >
              ✕
            </button>

            <button
              type="button"
              className="absolute left-4 md:left-8 text-white text-3xl md:text-4xl"
              onClick={showPrev}
            >
              ‹
            </button>
            <button
              type="button"
              className="absolute right-4 md:right-8 text-white text-3xl md:text-4xl"
              onClick={showNext}
            >
              ›
            </button>

            <div
              className="max-w-5xl w-full px-4"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <img
                src={currentImage.file_url}
                alt="Post image"
                className="w-full max-h-[80vh] object-contain mx-auto"
              />
            </div>
          </div>
        );
      })()}
    </div>
  );
};