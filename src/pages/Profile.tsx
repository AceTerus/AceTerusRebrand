import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { PostUpload } from '@/components/PostUpload';
import { FileUpload } from '@/components/FileUpload';
import { UsersList } from '@/components/UsersList';
import { FollowButton } from '@/components/FollowButton';
import { useToast } from '@/hooks/use-toast';
import { Calendar, FileText, Heart, MessageCircle, Download, Star, Trash2, Users, UserPlus, Flame, Trophy, Award, Target, Zap, Search } from 'lucide-react';

interface Post {
  id: string;
  content: string;
  image_url?: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  tags: string[];
}

interface Upload {
  id: string;
  title: string;
  description?: string;
  file_url: string;
  file_type: string;
  file_size?: number;
  download_count: number;
  rating: number;
  created_at: string;
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

interface StreakData {
  current: number;
  longest: number;
  lastActive: string;
}

export const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [followers, setFollowers] = useState<string[]>([]);
  const [following, setFollowing] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Streak and achievements data (this could be moved to database later)
  const [streakData] = useState<StreakData>({
    current: 7,
    longest: 15,
    lastActive: new Date().toISOString(),
  });
  
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

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchPosts();
      fetchUploads();
      fetchFollowers();
      fetchFollowing();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', error);
        return;
      }

      if (!data) {
        // Create profile if it doesn't exist
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
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
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchFollowers = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('followed_id', user.id);

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
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('follows')
        .select('followed_id')
        .eq('follower_id', user.id);

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
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching posts:', error);
        return;
      }

      setPosts(data || []);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUploads = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('uploads')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching uploads:', error);
        return;
      }

      setUploads(data || []);
    } catch (error) {
      console.error('Error fetching uploads:', error);
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

  const deleteUpload = async (uploadId: string) => {
    try {
      const { error } = await supabase
        .from('uploads')
        .delete()
        .eq('id', uploadId);

      if (error) {
        console.error('Error deleting upload:', error);
        toast({
          title: 'Error',
          description: 'Failed to delete upload',
          variant: 'destructive',
        });
        return;
      }

      setUploads(uploads.filter(upload => upload.id !== uploadId));
      toast({
        title: 'Success',
        description: 'Upload deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting upload:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete upload',
        variant: 'destructive',
      });
    }
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
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 pt-20">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Profile Header */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile?.avatar_url || "/placeholder.svg"} />
                <AvatarFallback className="text-2xl">
                  {profile?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-3xl font-bold mb-2">
                  {profile?.username || user?.email?.split('@')[0] || 'Anonymous User'}
                </h1>
                <p className="text-muted-foreground mb-4">
                  {profile?.bio || 'Creative professional sharing amazing content'}
                </p>
                <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                  <div className="text-center">
                    <div className="font-bold text-lg">{posts.length}</div>
                    <div className="text-sm text-muted-foreground">Posts</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-lg">{uploads.length}</div>
                    <div className="text-sm text-muted-foreground">Uploads</div>
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
                          <span className="text-xs font-bold text-primary-foreground">{streakData.current}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">Streak</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Streak and Achievements Section */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          {/* Streak Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-orange-500" />
                Streak Statistics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/50 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <Zap className="w-8 h-8 text-orange-600" />
                  </div>
                  <p className="text-2xl font-bold text-orange-600">{streakData.current}</p>
                  <p className="text-sm text-muted-foreground">Current Streak</p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <Target className="w-8 h-8 text-blue-600" />
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{streakData.longest}</p>
                  <p className="text-sm text-muted-foreground">Longest Streak</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Achievements */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Achievements ({achievements.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {achievements.map((achievement) => {
                  const getIcon = (iconName: string) => {
                    const icons = { Upload: FileText, Heart, Flame, Award, Trophy, Target };
                    return icons[iconName as keyof typeof icons] || Trophy;
                  };
                  const Icon = getIcon(achievement.icon);
                  
                  const getCategoryColor = (category: string) => {
                    const colors = {
                      milestone: "text-blue-500 bg-blue-500/10",
                      engagement: "text-pink-500 bg-pink-500/10",
                      consistency: "text-orange-500 bg-orange-500/10",
                      contribution: "text-green-500 bg-green-500/10",
                    };
                    return colors[category as keyof typeof colors] || "text-gray-500 bg-gray-500/10";
                  };

                  return (
                    <div
                      key={achievement.id}
                      className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg"
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getCategoryColor(achievement.category)}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{achievement.title}</p>
                        <p className="text-xs text-muted-foreground">{achievement.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="uploads">Uploads</TabsTrigger>
            <TabsTrigger value="followers">Followers</TabsTrigger>
            <TabsTrigger value="following">Following</TabsTrigger>
          </TabsList>
          
          <TabsContent value="posts" className="space-y-6">
            <PostUpload onPostCreated={fetchPosts} />
            
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
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {profile?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-sm">
                                {profile?.username || user?.email?.split('@')[0] || 'Anonymous'}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(post.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deletePost(post.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <p className="text-sm mb-3">{post.content}</p>
                        
                        {post.image_url && (
                          <img
                            src={post.image_url}
                            alt="Post image"
                            className="w-full max-w-md h-48 object-cover rounded-lg mb-3"
                          />
                        )}
                        
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
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="uploads" className="space-y-6">
            <FileUpload onUploadCreated={fetchUploads} />
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  File Uploads
                </CardTitle>
              </CardHeader>
              <CardContent>
                {uploads.length === 0 ? (
                  <p className="text-muted-foreground">No uploads yet. Upload your first file above!</p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {uploads.map((upload) => (
                      <Card key={upload.id} className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-sm">{upload.title}</h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteUpload(upload.id)}
                            className="text-destructive hover:text-destructive h-6 w-6 p-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        {upload.description && (
                          <p className="text-xs text-muted-foreground mb-2">
                            {upload.description}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                          <span>{upload.file_type}</span>
                          {upload.file_size && (
                            <span>{(upload.file_size / 1024 / 1024).toFixed(1)} MB</span>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 text-xs">
                            <div className="flex items-center gap-1">
                              <Download className="h-3 w-3" />
                              {upload.download_count}
                            </div>
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3" />
                              {upload.rating.toFixed(1)}
                            </div>
                          </div>
                          
                          <Button asChild size="sm" variant="outline" className="h-6 text-xs">
                            <a href={upload.file_url} download>
                              Download
                            </a>
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="followers">
            <UsersList title="Followers" userIds={followers} />
          </TabsContent>

          <TabsContent value="following">
            <UsersList title="Following" userIds={following} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};