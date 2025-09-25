import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PostUpload } from "@/components/PostUpload";
import { FileUpload } from "@/components/FileUpload";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Edit,
  MapPin,
  Calendar,
  Mail,
  GraduationCap,
  MessageCircle,
  Download,
  Upload,
  Star,
  Heart,
  Flame,
  Trophy,
  Award,
  Target,
  Zap,
  Trash2,
} from "lucide-react";

const Profile = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [uploads, setUploads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user: authUser } = useAuth();
  const { toast } = useToast();
  
  const [user, setUser] = useState({
    name: authUser?.email?.split('@')[0] || "User",
    username: "@" + (authUser?.email?.split('@')[0] || "user"),
    email: authUser?.email || "",
    bio: "Share your thoughts and study materials with the community!",
    location: "University",
    joinDate: "January 2024",
    major: "Student",
    year: "Current",
    avatar: "",
    stats: {
      posts: 0,
      uploads: 0,
      downloads: 0,
      followers: 0,
      following: 0,
    },
    streak: {
      current: 1,
      longest: 1,
      lastActive: new Date().toISOString(),
    },
    achievements: [
      {
        id: 1,
        title: "Welcome!",
        description: "Joined the community",
        icon: "Trophy",
        earnedAt: "2024-01-01",
        category: "milestone",
      },
    ],
  });

  const [editForm, setEditForm] = useState({ ...user });

  // Load user posts and uploads
  const loadPosts = async () => {
    if (!authUser) return;
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPosts(data || []);
    } catch (error: any) {
      console.error('Error loading posts:', error);
    }
  };

  const loadUploads = async () => {
    if (!authUser) return;
    try {
      const { data, error } = await supabase
        .from('uploads')
        .select('*')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setUploads(data || []);
    } catch (error: any) {
      console.error('Error loading uploads:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadPosts(), loadUploads()]);
    setLoading(false);
  };

  useEffect(() => {
    if (authUser) {
      loadData();
      // Update user stats
      setUser(prev => ({
        ...prev,
        name: authUser.email?.split('@')[0] || "User",
        username: "@" + (authUser.email?.split('@')[0] || "user"),
        email: authUser.email || "",
        stats: {
          ...prev.stats,
          posts: posts.length,
          uploads: uploads.length,
        }
      }));
    }
  }, [authUser]);

  useEffect(() => {
    // Update stats when posts/uploads change
    setUser(prev => ({
      ...prev,
      stats: {
        ...prev.stats,
        posts: posts.length,
        uploads: uploads.length,
      }
    }));
  }, [posts.length, uploads.length]);

  const handleSaveProfile = () => {
    setUser({ ...editForm });
    setIsEditing(false);
  };

  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);
      
      if (error) throw error;
      
      setPosts(posts.filter(post => post.id !== postId));
      toast({
        title: "Post deleted",
        description: "Your post has been removed",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete post",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUpload = async (uploadId: string, fileUrl: string) => {
    try {
      // Delete from storage
      const fileName = fileUrl.split('/').pop();
      if (fileName) {
        const { error: storageError } = await supabase.storage
          .from('user-uploads')
          .remove([`${authUser?.id}/${fileName}`]);
        
        if (storageError) console.error('Storage deletion error:', storageError);
      }

      // Delete from database
      const { error } = await supabase
        .from('uploads')
        .delete()
        .eq('id', uploadId);
      
      if (error) throw error;
      
      setUploads(uploads.filter(upload => upload.id !== uploadId));
      toast({
        title: "File deleted",
        description: "Your file has been removed",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete file",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return "1 day ago";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!authUser) {
    return (
      <div className="min-h-screen pt-20 pb-8 bg-gradient-to-br from-background via-muted/20 to-background">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <h1 className="text-2xl font-bold mb-4">Please sign in to view your profile</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-8 bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Profile Header */}
        <Card className="mb-6 overflow-hidden shadow-elegant">
          {/* Cover Image - FIXED: Proper spacing without overlap */}
          <div className="h-20 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 relative">
            <Button
              onClick={() => setIsEditing(!isEditing)}
              variant="secondary"
              size="sm"
              className="absolute top-3 right-3 shadow-sm bg-white/90 backdrop-blur-sm hover:bg-white"
            >
              <Edit className="w-4 h-4 mr-1" />
              {isEditing ? "Cancel" : "Edit Profile"}
            </Button>
          </div>

          <CardContent className="px-6 pb-6 pt-6">
            {/* Avatar and Basic Info - FIXED: No negative margin to prevent overlap */}
            <div className="flex flex-col md:flex-row md:items-start md:space-x-4">
              <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-background shadow-elegant bg-gradient-to-br from-blue-600 to-purple-600 text-white flex items-center justify-center text-xl font-bold">
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  user.name.charAt(0)
                )}
              </div>


              <div className="flex-1 mt-4 md:mt-0">
                {isEditing ? (
                  <div className="space-y-3">
                    <Input
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="text-xl font-bold"
                    />
                    <Textarea
                      value={editForm.bio}
                      onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                      rows={2}
                      className="resize-none"
                    />
                  </div>
                ) : (
                  <>
                    <h1 className="text-2xl font-bold">{user.name}</h1>
                    <p className="text-muted-foreground mb-2">{user.username}</p>
                    <p className="text-sm mb-3">{user.bio}</p>
                  </>
                )}

                {/* Profile Details */}
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Mail className="w-4 h-4" />
                    <span>{user.email}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-4 h-4" />
                    {isEditing ? (
                      <Input
                        value={editForm.location}
                        onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                        className="h-6 text-sm w-32"
                      />
                    ) : (
                      <span>{user.location}</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <GraduationCap className="w-4 h-4" />
                    {isEditing ? (
                      <Input
                        value={editForm.major}
                        onChange={(e) => setEditForm({ ...editForm, major: e.target.value })}
                        className="h-6 text-sm w-32"
                      />
                    ) : (
                      <span>{user.major}</span>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>Joined {user.joinDate}</span>
                  </div>
                </div>
              </div>

              {isEditing && (
                <Button onClick={handleSaveProfile} className="mt-4 md:mt-0 bg-gradient-primary shadow-glow">
                  Save Changes
                </Button>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-6 gap-4 mt-6 pt-6 border-t border-border/50">
              {Object.entries(user.stats).map(([key, value]) => (
                <div key={key} className="text-center">
                  <p className="text-xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground capitalize">{key}</p>
                </div>
              ))}
              
              {/* Streak Badge */}
              <div className="text-center">
                <div className="flex items-center justify-center mb-1">
                  <div className="relative">
                    <Flame className="w-6 h-6 text-orange-500" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-primary rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-primary-foreground">{user.streak.current}</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Day Streak</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Achievements Section */}
        <div className="space-y-6 mb-6">
          {/* Streak Stats */}
          <Card className="shadow-elegant">
            <CardHeader>
              <h3 className="font-semibold text-lg flex items-center">
                <Flame className="w-5 h-5 text-orange-500 mr-2" />
                Streak Statistics
              </h3>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center p-4 bg-gradient-primary/10 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <Zap className="w-8 h-8 text-primary" />
                  </div>
                  <p className="text-2xl font-bold text-primary">{user.streak.current}</p>
                  <p className="text-sm text-muted-foreground">Current Streak</p>
                </div>
                <div className="text-center p-4 bg-gradient-hero/10 rounded-lg">
                  <div className="flex items-center justify-center mb-2">
                    <Target className="w-8 h-8 text-secondary" />
                  </div>
                  <p className="text-2xl font-bold text-secondary">{user.streak.longest}</p>
                  <p className="text-sm text-muted-foreground">Longest Streak</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Achievements Grid */}
          <Card className="shadow-elegant">
            <CardHeader>
              <h3 className="font-semibold text-lg flex items-center">
                <Trophy className="w-5 h-5 text-yellow-500 mr-2" />
                Trophy Collection ({user.achievements.length})
              </h3>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {user.achievements.map((achievement) => {
                  const getIcon = (iconName: string) => {
                    const icons = { Upload, Heart, Flame, Award, Trophy, Target };
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
                      className="flex items-start space-x-3 p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getCategoryColor(achievement.category)}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm mb-1">{achievement.title}</h4>
                        <p className="text-xs text-muted-foreground mb-2">
                          {achievement.description}
                        </p>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs capitalize">
                            {achievement.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Earned {achievement.earnedAt}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="posts" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="uploads">Uploads</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Posts Tab */}
          <TabsContent value="posts" className="space-y-4">
            <PostUpload onPostCreated={loadPosts} />
            
            {loading ? (
              <div className="text-center py-8">Loading posts...</div>
            ) : posts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No posts yet. Share your first post above!
              </div>
            ) : (
              posts.map((post) => (
                <Card key={post.id} className="shadow-elegant hover:shadow-glow transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-primary text-primary-foreground flex items-center justify-center font-bold">
                        {user.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-sm">{user.name}</h3>
                            <span className="text-muted-foreground text-xs">{formatDate(post.created_at)}</span>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeletePost(post.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                        <p className="text-sm mb-3">{post.content}</p>

                        {/* Image */}
                        {post.image_url && (
                          <img 
                            src={post.image_url} 
                            alt="Post image" 
                            className="rounded-lg max-h-40 object-cover mb-3"
                          />
                        )}

                        {/* Tags */}
                        {post.tags && post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {post.tags.map((tag: string) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center space-x-4 text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Heart className="w-4 h-4" />
                            <span className="text-sm">{post.likes_count || 0}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MessageCircle className="w-4 h-4" />
                            <span className="text-sm">{post.comments_count || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Uploads Tab */}
          <TabsContent value="uploads">
            <FileUpload onUploadCreated={loadUploads} />
            
            {loading ? (
              <div className="text-center py-8">Loading uploads...</div>
            ) : uploads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No uploads yet. Upload your first file above!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {uploads.map((upload) => (
                    <Card key={upload.id} className="shadow-elegant hover:shadow-glow transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-sm mb-1">{upload.title}</h3>
                            {upload.description && (
                              <p className="text-xs text-muted-foreground mb-2">{upload.description}</p>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {upload.file_type.split('/')[1]?.toUpperCase() || 'FILE'}
                            </Badge>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteUpload(upload.id, upload.file_url)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <Download className="w-3 h-3" />
                            <span>{upload.download_count || 0} downloads</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span>{formatFileSize(upload.file_size || 0)}</span>
                            <span>{formatDate(upload.created_at)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity">
            <Card className="shadow-elegant">
              <CardHeader>
                <h3 className="font-semibold text-lg">Recent Activity</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center py-8 text-muted-foreground">
                  Activity tracking coming soon!
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;