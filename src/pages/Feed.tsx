import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { FollowButton } from "@/components/FollowButton";
import { LikeButton } from "@/components/LikeButton";
import { CommentSection } from "@/components/CommentSection";
import { PostUpload } from "@/components/PostUpload";
import { PostImageCarousel } from "@/components/PostImageCarousel";

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
  images?: { id: string; file_url: string }[];
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
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [suggestedUsers, setSuggestedUsers] = useState<SearchProfile[]>([]);
  const [lightboxPostId, setLightboxPostId] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

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
        .limit(30);

      if (postsError) throw postsError;

      const postsArray = postsData || [];

      const postUserIds = [...new Set(postsArray.map((p) => p.user_id))];
      const { data: profilesData } = postUserIds.length
        ? await supabase
            .from("profiles")
            .select("user_id, username, avatar_url")
            .in("user_id", postUserIds)
        : { data: [] };
      const profilesMap = new Map((profilesData || []).map((p) => [p.user_id, p]));

      const postIds = postsArray.map((p) => p.id);
      let imagesByPost = new Map<string, { id: string; file_url: string }[]>();

      if (postIds.length > 0) {
        const { data: imagesData } = await supabase
          .from("post_images")
          .select("id, post_id, file_url, position")
          .in("post_id", postIds)
          .order("position", { ascending: true });

        (imagesData || []).forEach((img: any) => {
          const arr = imagesByPost.get(img.post_id) || [];
          arr.push({ id: img.id, file_url: img.file_url });
          imagesByPost.set(img.post_id, arr);
        });
      }

      const postsWithImages: Post[] = postsArray.map((post: any) => ({
        ...post,
        profiles: profilesMap.get(post.user_id) || { username: "Anonymous", avatar_url: "" },
        images: imagesByPost.get(post.id) || [],
      }));

      setPosts(postsWithImages);
    } catch (error) {
      console.error("Error fetching feed:", error);
      toast({ title: "Error", description: "Failed to load feed", variant: "destructive" });
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
    if (!query.trim()) { setSearchResults([]); return; }
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

  const openLightbox = (postId: string, index: number) => {
    setLightboxPostId(postId);
    setLightboxIndex(index);
  };

  const closeLightbox = () => setLightboxPostId(null);

  const showPrev = () => {
    const post = posts.find((p) => p.id === lightboxPostId);
    if (!post?.images?.length) return;
    setLightboxIndex((prev) => (prev === 0 ? post.images!.length - 1 : prev - 1));
  };

  const showNext = () => {
    const post = posts.find((p) => p.id === lightboxPostId);
    if (!post?.images?.length) return;
    setLightboxIndex((prev) => (prev === post.images!.length - 1 ? 0 : prev + 1));
  };

  const handleTouchStart = (e: React.TouchEvent) => setTouchStartX(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX;
    if (diff > 50) showPrev();
    else if (diff < -50) showNext();
    setTouchStartX(null);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-muted-foreground">Please sign in to view your feed</p>
      </div>
    );
  }

  const currentLightboxPost = lightboxPostId ? posts.find((p) => p.id === lightboxPostId) : null;
  const currentLightboxImage = currentLightboxPost?.images?.[lightboxIndex];

  return (
    <div className="min-h-screen bg-transparent pb-24 lg:pb-8">
      {/* Two-column layout on desktop */}
      <div className="mx-auto w-full max-w-5xl px-4 pt-4 lg:grid lg:grid-cols-[1fr_288px] lg:gap-8 lg:items-start">

        {/* ── Left column: feed ── */}
        <div className="w-full min-w-0">

          {/* Search */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search people..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-9 rounded-full bg-muted/50 border-0 focus-visible:ring-1 text-sm"
              />
            </div>

            {searchQuery && (
              <Card className="mt-2 shadow-lg">
                <CardContent className="p-3 space-y-2">
                  {isSearching ? (
                    <p className="text-sm text-muted-foreground py-2 text-center">Searching…</p>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((profile) => (
                      <div key={profile.id} className="flex items-center justify-between gap-3">
                        <Link to={`/profile/${profile.user_id}`} className="flex items-center gap-3 flex-1 min-w-0">
                          <Avatar className="h-9 w-9 flex-shrink-0">
                            <AvatarImage src={profile.avatar_url} />
                            <AvatarFallback>{profile.username?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{profile.username}</p>
                            <p className="text-xs text-foreground/55">{profile.followers_count} followers</p>
                          </div>
                        </Link>
                        <FollowButton targetUserId={profile.user_id} />
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground py-2 text-center">No users found</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Suggested users strip — shown when feed is empty */}
          {!isLoading && suggestedUsers.length > 0 && posts.length === 0 && (
            <div className="mb-6">
              <p className="text-xs font-semibold text-foreground/50 mb-3 uppercase tracking-widest">Suggested for you</p>
              <div className="space-y-3">
                {suggestedUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between gap-3">
                    <Link to={`/profile/${u.user_id}`} className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-10 w-10 flex-shrink-0">
                        <AvatarImage src={u.avatar_url} />
                        <AvatarFallback>{u.username?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{u.username}</p>
                        <p className="text-xs text-foreground/55">{u.followers_count} followers</p>
                      </div>
                    </Link>
                    <FollowButton targetUserId={u.user_id} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Post creation */}
          <div className="mb-5">
            <PostUpload onPostCreated={fetchFeed} />
          </div>

          {/* Feed */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl overflow-hidden border border-border/60 bg-card shadow-sm">
                  <div className="flex items-center gap-3 p-4">
                    <Skeleton className="h-9 w-9 rounded-full flex-shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-2.5 w-16" />
                    </div>
                  </div>
                  <Skeleton className="w-full aspect-square" />
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-base">No posts yet.</p>
              <p className="text-sm mt-1">Follow some users to see their content here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => {
                const hasGalleryImages = !!(post.images && post.images.length);
                const gallery = (post.images?.map((img) => img.file_url) ?? []).concat(
                  !hasGalleryImages && post.image_url ? [post.image_url] : []
                );

                return (
                  <article key={post.id} className="rounded-2xl overflow-hidden border border-border/60 bg-card shadow-sm">
                    {/* Header */}
                    <div className="flex items-center gap-3 px-4 py-3">
                      <Link to={`/profile/${post.user_id}`} className="flex-shrink-0">
                        <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                          <AvatarImage src={post.profiles?.avatar_url} />
                          <AvatarFallback className="text-sm font-bold">
                            {post.profiles?.username?.[0]?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/profile/${post.user_id}`}
                          className="font-bold text-[15px] leading-tight hover:underline block truncate"
                        >
                          {post.profiles?.username || "Anonymous"}
                        </Link>
                        <p className="text-xs text-foreground/55 mt-0.5">
                          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>

                    {/* Image — edge-to-edge */}
                    {gallery.length > 0 && (
                      <PostImageCarousel
                        images={gallery}
                        onImageClick={hasGalleryImages ? (idx) => openLightbox(post.id, idx) : undefined}
                      />
                    )}

                    {/* Action bar */}
                    <div className="flex items-start gap-1 px-3 pt-2 pb-1">
                      <LikeButton
                        postId={post.id}
                        likesCount={post.likes_count}
                        onLikeChange={(newCount) =>
                          setPosts((prev) =>
                            prev.map((p) => (p.id === post.id ? { ...p, likes_count: newCount } : p))
                          )
                        }
                      />
                      <CommentSection
                        postId={post.id}
                        commentsCount={post.comments_count}
                        onCommentChange={(newCount) =>
                          setPosts((prev) =>
                            prev.map((p) => (p.id === post.id ? { ...p, comments_count: newCount } : p))
                          )
                        }
                      />
                    </div>

                    {/* Caption — username bolded inline, Instagram-style */}
                    {post.content && (
                      <p className="px-4 pb-2 text-sm leading-relaxed">
                        <Link
                          to={`/profile/${post.user_id}`}
                          className="font-bold mr-1.5 hover:underline"
                        >
                          {post.profiles?.username || "Anonymous"}
                        </Link>
                        {post.content}
                      </p>
                    )}

                    {/* Tags */}
                    {post.tags && post.tags.length > 0 && (
                      <div className="px-4 pb-4 flex flex-wrap gap-x-2 gap-y-1">
                        {post.tags.map((tag, i) => (
                          <span key={i} className="text-xs font-medium text-primary">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Right column: sidebar (desktop only) ── */}
        <aside className="hidden lg:block sticky top-4 space-y-5">

          {/* Suggested people */}
          {suggestedUsers.length > 0 && (
            <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-5">
              <p className="text-xs font-semibold text-foreground/50 uppercase tracking-widest mb-4">Suggested for you</p>
              <div className="space-y-4">
                {suggestedUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between gap-3">
                    <Link to={`/profile/${u.user_id}`} className="flex items-center gap-3 flex-1 min-w-0">
                      <Avatar className="h-9 w-9 flex-shrink-0">
                        <AvatarImage src={u.avatar_url} />
                        <AvatarFallback>{u.username?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{u.username}</p>
                        <p className="text-xs text-foreground/55">{u.followers_count} followers</p>
                      </div>
                    </Link>
                    <FollowButton targetUserId={u.user_id} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick links */}
          <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-5">
            <p className="text-xs font-semibold text-foreground/50 uppercase tracking-widest mb-3">Explore</p>
            <div className="space-y-2 text-sm">
              <Link to="/quiz" className="flex items-center gap-2 text-foreground/70 hover:text-primary transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                Quiz Arena
              </Link>
              <Link to="/discover" className="flex items-center gap-2 text-foreground/70 hover:text-primary transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                Discover People
              </Link>
              <Link to="/materials" className="flex items-center gap-2 text-foreground/70 hover:text-primary transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                Study Materials
              </Link>
              <Link to="/ar-scanner" className="flex items-center gap-2 text-foreground/70 hover:text-primary transition-colors">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/60" />
                AR Scanner
              </Link>
            </div>
          </div>
        </aside>
      </div>

      {/* Fullscreen lightbox */}
      {currentLightboxPost && currentLightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <button
            type="button"
            className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl leading-none z-10"
            onClick={closeLightbox}
            aria-label="Close"
          >
            ✕
          </button>
          <button
            type="button"
            className="absolute left-4 text-white/80 hover:text-white text-4xl leading-none z-10"
            onClick={showPrev}
            aria-label="Previous"
          >
            ‹
          </button>
          <button
            type="button"
            className="absolute right-4 text-white/80 hover:text-white text-4xl leading-none z-10"
            onClick={showNext}
            aria-label="Next"
          >
            ›
          </button>
          <img
            src={currentLightboxImage.file_url}
            alt="Full size"
            className="max-w-full max-h-[92vh] object-contain select-none"
            draggable={false}
          />
          {currentLightboxPost.images && currentLightboxPost.images.length > 1 && (
            <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-1.5">
              {currentLightboxPost.images.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full bg-white transition-all duration-300 ${
                    i === lightboxIndex ? "w-5 opacity-100" : "w-1.5 opacity-40"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
