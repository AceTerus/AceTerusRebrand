import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Calendar, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { FollowButton } from "@/components/FollowButton";
import { LikeButton } from "@/components/LikeButton";
import { CommentSection } from "@/components/CommentSection";

interface Post {
  id: string;
  content: string;
  image_url: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string;
  };
}

interface Upload {
  id: string;
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

  useEffect(() => {
    if (user) {
      fetchFeed();
    }
  }, [user]);

  const fetchFeed = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Get list of users that current user follows
      const { data: followedUsers } = await supabase
        .from("follows")
        .select("followed_id")
        .eq("follower_id", user.id);

      const followedIds = followedUsers?.map((f) => f.followed_id) || [];

      // Fetch posts from followed users and join with profiles
      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select("*")
        .in("user_id", followedIds)
        .order("created_at", { ascending: false })
        .limit(20);

      if (postsError) throw postsError;

      // Fetch profile data for posts
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

      // Fetch uploads from followed users
      const { data: uploadsData, error: uploadsError } = await supabase
        .from("uploads")
        .select("*")
        .in("user_id", followedIds)
        .order("created_at", { ascending: false })
        .limit(20);

      if (uploadsError) throw uploadsError;

      // Fetch profile data for uploads
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

  if (!user) {
    return (
      <div className="min-h-screen pt-24 px-4">
        <div className="container mx-auto max-w-2xl text-center">
          <p className="text-muted-foreground">Please sign in to view your feed</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 px-4 pb-8 bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="container mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold mb-6">
          <span className="bg-gradient-primary bg-clip-text text-transparent">
            Your Feed
          </span>
        </h1>

        {/* Search Bar */}
        <div className="mb-8">
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

          {/* Search Results */}
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

        {isLoading ? (
          <div className="space-y-4">
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
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">
                No posts or uploads yet. Follow some users to see their content here!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Posts Section */}
            {posts.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Recent Posts</h2>
                {posts.map((post) => (
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
                          <p className="font-semibold">{post.profiles?.username || "Anonymous"}</p>
                          <p className="text-sm text-muted-foreground flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {formatDate(post.created_at)}
                          </p>
                        </div>
                      </div>

                      <p className="mb-4">{post.content}</p>

                      {post.image_url && (
                        <img
                          src={post.image_url}
                          alt="Post"
                          className="w-full rounded-lg mb-4"
                        />
                      )}

                      <div className="flex items-center space-x-4">
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
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Uploads Section */}
            {uploads.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Recent Uploads</h2>
                {uploads.map((upload) => (
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
                          <p className="font-semibold">{upload.profiles?.username || "Anonymous"}</p>
                          <p className="text-sm text-muted-foreground flex items-center">
                            <Calendar className="w-3 h-3 mr-1" />
                            {formatDate(upload.created_at)}
                          </p>
                        </div>
                      </div>

                      <h3 className="font-semibold mb-2">{upload.title}</h3>
                      {upload.description && (
                        <p className="text-sm text-muted-foreground mb-4">
                          {upload.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-xs bg-muted px-2 py-1 rounded">
                          {upload.file_type}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {upload.download_count} downloads
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};