import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Calendar, Search, TrendingUp, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { FollowButton } from "@/components/FollowButton";
import { LikeButton } from "@/components/LikeButton";
import { CommentSection } from "@/components/CommentSection";
import { PostUpload } from "@/components/PostUpload";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  tags?: string[];
  profiles: {
    username: string;
    avatar_url: string;
  };
}

interface Upload {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_type: string;
  download_count: number;
  rating: number;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string;
  };
}

interface SearchProfile {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string;
  bio: string;
  followers_count: number;
}

export const Feed = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [suggestedUsers, setSuggestedUsers] = useState<SearchProfile[]>([]);

  useEffect(() => {
    if (user) {
      fetchFeed();
      fetchSuggestedUsers();
    }
  }, [user]);

  const fetchFeed = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data: followedUsers } = await supabase
        .from("follows")
        .select("followed_id")
        .eq("follower_id", user.id);

      const followedIds = followedUsers?.map((f) => f.followed_id) || [];

      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select("*")
        .in("user_id", followedIds)
        .order("created_at", { ascending: false })
        .limit(20);

      if (postsError) throw postsError;

      const postsWithProfiles = await Promise.all(
        (postsData || []).map(async (post) => {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("username, avatar_url")
            .eq("user_id", post.user_id)
            .single();

          return {
            ...post,
            profiles: profileData || { username: "Anonymous", avatar_url: "" },
          };
        })
      );

      const { data: uploadsData, error: uploadsError } = await supabase
        .from("uploads")
        .select("*")
        .in("user_id", followedIds)
        .order("created_at", { ascending: false })
        .limit(20);

      if (uploadsError) throw uploadsError;

      const uploadsWithProfiles = await Promise.all(
        (uploadsData || []).map(async (upload) => {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("username, avatar_url")
            .eq("user_id", upload.user_id)
            .single();

          return {
            ...upload,
            profiles: profileData || { username: "Anonymous", avatar_url: "" },
          };
        })
      );

      setPosts(postsWithProfiles);
      setUploads(uploadsWithProfiles);
    } catch (error) {
      console.error("Error fetching feed:", error);
      toast({
        title: "Error",
        description: "Failed to load feed",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSuggestedUsers = async () => {
    if (!user) return;

    try {
      const { data: followedUsers } = await supabase
        .from("follows")
        .select("followed_id")
        .eq("follower_id", user.id);

      const followedIds = followedUsers?.map((f) => f.followed_id) || [];
      followedIds.push(user.id);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .not("user_id", "in", `(${followedIds.join(",")})`)
        .order("followers_count", { ascending: false })
        .limit(3);

      if (error) throw error;
      setSuggestedUsers(data || []);
    } catch (error) {
      console.error("Error fetching suggested users:", error);
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
        .from("profiles")
        .select("*")
        .ilike("username", `%${query}%`)
        .limit(5);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    searchUsers(value);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const renderPost = (post: Post) => (
    <Card key={post.id} className="shadow-elegant hover:shadow-glow transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start space-x-4 mb-4">
          <Avatar>
            <AvatarImage src={post.profiles?.avatar_url} />
            <AvatarFallback>
              {post.profiles?.username?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <Link to={`/profile/${post.user_id}`} className="font-semibold hover:underline">
              {post.profiles?.username || "Anonymous"}
            </Link>
            <p className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>

        <p className="mb-4 whitespace-pre-wrap">{post.content}</p>

        {post.image_url && (
          <img
            src={post.image_url}
            alt="Post content"
            className="w-full rounded-lg mb-4 max-h-96 object-cover"
          />
        )}

        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map((tag, i) => (
              <Badge key={i} variant="secondary" className="text-xs">
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="pt-2 border-t">
          <div className="flex items-center gap-6">
            <LikeButton
              postId={post.id}
              likesCount={post.likes_count}
              onLikeChange={(newCount) => {
                setPosts(posts.map(p => 
                  p.id === post.id ? { ...p, likes_count: newCount } : p
                ));
              }}
            />
            <CommentSection
              postId={post.id}
              commentsCount={post.comments_count}
              onCommentChange={(newCount) => {
                setPosts(posts.map(p => 
                  p.id === post.id ? { ...p, comments_count: newCount } : p
                ));
              }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderUpload = (upload: Upload) => (
    <Card key={upload.id} className="shadow-elegant hover:shadow-glow transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start space-x-4 mb-4">
          <Avatar>
            <AvatarImage src={upload.profiles?.avatar_url} />
            <AvatarFallback>
              {upload.profiles?.username?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <Link to={`/profile/${upload.user_id}`} className="font-semibold hover:underline">
              {upload.profiles?.username || "Anonymous"}
            </Link>
            <p className="text-sm text-muted-foreground">
              {formatDistanceToNow(new Date(upload.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>

        <h3 className="font-semibold mb-2 text-lg">{upload.title}</h3>
        {upload.description && (
          <p className="text-sm text-muted-foreground mb-4">
            {upload.description}
          </p>
        )}

        <div className="flex items-center justify-between pt-3 border-t">
          <Badge variant="outline">{upload.file_type}</Badge>
          <span className="text-sm text-muted-foreground">
            {upload.download_count} downloads
          </span>
        </div>
      </CardContent>
    </Card>
  );

  if (!user) {
    return (
      <div className="min-h-screen px-4 flex items-center justify-center">
        <div className="container mx-auto max-w-2xl text-center">
          <p className="text-muted-foreground">Please sign in to view your feed</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-8 bg-gradient-to-br from-background via-muted/20 to-background">
        <div className="container mx-auto max-w-5xl">
          <div className="grid lg:grid-cols-12 gap-6">
            {/* Main Feed */}
            <main className="lg:col-span-8">
            <h1 className="text-3xl font-bold mb-6">
              <span className="bg-gradient-primary bg-clip-text text-transparent">
                Your Feed
              </span>
            </h1>

            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Search for users..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="pl-10"
                />
              </div>

              {searchQuery && (
                <Card className="mt-2">
                  <CardContent className="p-4">
                    {isSearching ? (
                      <p className="text-sm text-muted-foreground">Searching...</p>
                    ) : searchResults.length > 0 ? (
                      <div className="space-y-3">
                        {searchResults.map((profile) => (
                          <div
                            key={profile.id}
                            className="flex items-center justify-between"
                          >
                            <div className="flex items-center space-x-3">
                              <Avatar>
                                <AvatarImage src={profile.avatar_url} />
                                <AvatarFallback>
                                  {profile.username?.[0]?.toUpperCase() || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-semibold">{profile.username}</p>
                                <p className="text-xs text-muted-foreground">
                                  {profile.followers_count} followers
                                </p>
                              </div>
                            </div>
                            <FollowButton targetUserId={profile.user_id} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No users found</p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Post Creation */}
            <PostUpload onPostCreated={fetchFeed} />

            {/* Content Tabs */}
            <Tabs defaultValue="all" className="mb-4">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="posts">Posts</TabsTrigger>
                <TabsTrigger value="uploads">Resources</TabsTrigger>
              </TabsList>

              {isLoading ? (
                <div className="space-y-4 mt-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i}>
                      <CardContent className="p-6">
                        <div className="flex items-start space-x-4">
                          <Skeleton className="w-12 h-12 rounded-full" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-1/4" />
                            <Skeleton className="h-20 w-full" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : posts.length === 0 && uploads.length === 0 ? (
                <Card className="mt-4">
                  <CardContent className="p-12 text-center">
                    <p className="text-muted-foreground">
                      No posts or uploads yet. Follow some users to see their content here!
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <TabsContent value="all" className="mt-4 space-y-4">
                    {posts.map(renderPost)}
                    {uploads.map(renderUpload)}
                  </TabsContent>

                  <TabsContent value="posts" className="mt-4 space-y-4">
                    {posts.length > 0 ? (
                      posts.map(renderPost)
                    ) : (
                      <Card>
                        <CardContent className="p-12 text-center">
                          <p className="text-muted-foreground">No posts yet</p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  <TabsContent value="uploads" className="mt-4 space-y-4">
                    {uploads.length > 0 ? (
                      uploads.map(renderUpload)
                    ) : (
                      <Card>
                        <CardContent className="p-12 text-center">
                          <p className="text-muted-foreground">No uploads yet</p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>
                </>
              )}
            </Tabs>
          </main>

          {/* Right Sidebar - Trending/Activity */}
          <aside className="hidden lg:block lg:col-span-4">
            <div className="sticky top-24 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="w-4 h-4" />
                    Popular Tags
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {["ComputerScience", "Programming", "AI", "WebDev", "DataStructures"].map((tag) => (
                    <div key={tag} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">#{tag}</span>
                      <Badge variant="secondary" className="text-xs">
                        {Math.floor(Math.random() * 50 + 10)}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
