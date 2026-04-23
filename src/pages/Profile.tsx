import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useStreak } from '@/hooks/useStreak';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { PostUpload } from '@/components/PostUpload';
import { PostImageCarousel } from '@/components/PostImageCarousel';
import { CommentSection } from '@/components/CommentSection';
import { LikeButton } from '@/components/LikeButton';
import { UsersList } from '@/components/UsersList';
import { FollowButton } from '@/components/FollowButton';
import { useToast } from '@/hooks/use-toast';
import {
  Camera, Flame, Trash2, Users, Search, Lock,
  Settings, CheckCircle, XCircle, SkipForward, BarChart2,
  Zap, Target, PenLine, GraduationCap,
} from 'lucide-react';
import { NotificationsBell } from '@/components/NotificationsBell';
import { useMutualFollow } from '@/hooks/useMutualFollow';
import { StreakLeaderboard } from '@/components/StreakLeaderboard';

/* ── brand ── */
const C = {
  cyan: '#3BD6F5', blue: '#2F7CFF', indigo: '#2E2BE5',
  ink: '#0F172A', skySoft: '#DDF3FF', indigoSoft: '#D6D4FF',
  pop: '#FF7A59', sun: '#FFD65C',
  mintSoft: '#D1FAE5', lavender: '#EDE9FE', peach: '#FFE4D6', lemon: '#FEF9C3', rose: '#FFE4E6',
};
const DISPLAY = "font-['Baloo_2'] tracking-tight";
const CARD = 'border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[3px_3px_0_0_#0F172A] bg-white overflow-hidden';
const INPUT = 'w-full px-4 py-2.5 text-sm font-semibold border-[2px] border-[#0F172A] rounded-full shadow-[1px_1px_0_0_#0F172A] bg-white outline-none focus:shadow-[2px_2px_0_0_#0F172A] transition-shadow placeholder:text-slate-400';
const BTN_PRIMARY = 'inline-flex items-center justify-center gap-2 font-extrabold font-[\'Baloo_2\'] text-sm border-[2.5px] border-[#0F172A] rounded-full px-5 py-2.5 shadow-[3px_3px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#0F172A] transition-all text-white cursor-pointer disabled:opacity-50 disabled:pointer-events-none';
const BTN_OUTLINE = 'inline-flex items-center justify-center gap-2 font-extrabold font-[\'Baloo_2\'] text-sm border-[2.5px] border-[#0F172A] rounded-full px-5 py-2.5 shadow-[3px_3px_0_0_#0F172A] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#0F172A] transition-all bg-white text-[#0F172A] cursor-pointer disabled:opacity-50 disabled:pointer-events-none';

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
  cover_url: string | null;
  bio: string | null;
  followers_count: number;
  following_count: number;
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
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lightboxPostId, setLightboxPostId] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [isQuizHistoryOpen, setIsQuizHistoryOpen] = useState(false);
  const [quizHistory, setQuizHistory] = useState<any[]>([]);
  const [quizHistoryLoading, setQuizHistoryLoading] = useState(false);
  const [isFollowersOpen, setIsFollowersOpen] = useState(false);
  const [isFollowingOpen, setIsFollowingOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const profileUserId = userId || user?.id;
  const isOwnProfile = !userId || userId === user?.id;

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
      const { data, error } = await supabase.from('profiles').select('*').eq('user_id', profileUserId).single();
      if (error && error.code !== 'PGRST116') { console.error(error); return; }
      if (!data) {
        if (!user || profileUserId !== user.id) return;
        const { data: newProfile, error: createError } = await supabase.from('profiles')
          .insert({ user_id: profileUserId, username: user.email?.split('@')[0] || 'Anonymous' })
          .select().single();
        if (createError) { console.error(createError); return; }
        setProfile(newProfile);
      } else {
        setProfile(data);
        setEditUsername(data.username || '');
        setEditBio(data.bio || '');
      }
    } catch (e) { console.error(e); }
  };

  const handleUpdateProfile = async () => {
    if (!user || !profile) return;
    setIsUpdating(true);
    try {
      let avatarUrl = profile.avatar_url;
      if (avatarFile) {
        const filePath = `${user.id}/${Date.now()}.${avatarFile.name.split('.').pop()}`;
        const { error } = await supabase.storage.from('profile-images').upload(filePath, avatarFile, { upsert: true });
        if (error) throw error;
        avatarUrl = supabase.storage.from('profile-images').getPublicUrl(filePath).data.publicUrl;
      }
      let coverUrl = profile.cover_url;
      if (coverFile) {
        const filePath = `${user.id}/cover-${Date.now()}.${coverFile.name.split('.').pop()}`;
        const { error } = await supabase.storage.from('profile-images').upload(filePath, coverFile, { upsert: true });
        if (error) throw error;
        coverUrl = supabase.storage.from('profile-images').getPublicUrl(filePath).data.publicUrl;
      }
      const { error } = await supabase.from('profiles').update({ username: editUsername, bio: editBio, avatar_url: avatarUrl, cover_url: coverUrl }).eq('user_id', user.id);
      if (error) throw error;
      toast({ title: 'Profile updated!' });
      setIsEditDialogOpen(false);
      setAvatarFile(null); setCoverFile(null);
      fetchProfile();
    } catch {
      toast({ title: 'Error', description: 'Failed to update profile', variant: 'destructive' });
    } finally { setIsUpdating(false); }
  };

  const fetchFollowers = async () => {
    if (!profileUserId) return;
    const { data } = await supabase.from('follows').select('follower_id').eq('followed_id', profileUserId);
    setFollowers(data?.map(f => f.follower_id) || []);
  };

  const fetchFollowing = async () => {
    if (!profileUserId) return;
    const { data } = await supabase.from('follows').select('followed_id').eq('follower_id', profileUserId);
    setFollowing(data?.map(f => f.followed_id) || []);
  };

  const fetchPosts = async () => {
    if (!profileUserId) return;
    try {
      const { data: postsData, error } = await supabase.from('posts').select('*').eq('user_id', profileUserId).order('created_at', { ascending: false });
      if (error) { console.error(error); return; }
      const basePosts = postsData || [];
      const postIds = basePosts.map((p) => p.id);
      let imagesByPost = new Map<string, { id: string; file_url: string }[]>();
      if (postIds.length > 0) {
        const { data: imagesData } = await supabase.from('post_images').select('id, post_id, file_url, position').in('post_id', postIds).order('position', { ascending: true });
        (imagesData || []).forEach((img: any) => {
          const arr = imagesByPost.get(img.post_id) || [];
          arr.push({ id: img.id, file_url: img.file_url });
          imagesByPost.set(img.post_id, arr);
        });
      }
      setPosts(basePosts.map((post: any) => ({ ...post, images: imagesByPost.get(post.id) || [] })));
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const searchUsers = async (query: string) => {
    if (!query.trim()) { setSearchResults([]); return; }
    setIsSearching(true);
    try {
      const { data } = await supabase.from('profiles').select('*').ilike('username', `%${query}%`).neq('user_id', user?.id || '').limit(10);
      setSearchResults(data || []);
    } catch (e) { console.error(e); }
    finally { setIsSearching(false); }
  };

  const deletePost = async (postId: string) => {
    const { error } = await supabase.from('posts').delete().eq('id', postId);
    if (error) { toast({ title: 'Error', description: 'Failed to delete post', variant: 'destructive' }); return; }
    setPosts(posts.filter(p => p.id !== postId));
    toast({ title: 'Post deleted' });
  };

  const openLightbox = (postId: string, index: number) => { setLightboxPostId(postId); setLightboxIndex(index); };
  const closeLightbox = () => setLightboxPostId(null);

  const showPrev = () => {
    const post = posts.find((p) => p.id === lightboxPostId);
    if (!post?.images?.length) return;
    setLightboxIndex((prev) => prev === 0 ? post.images!.length - 1 : prev - 1);
  };
  const showNext = () => {
    const post = posts.find((p) => p.id === lightboxPostId);
    if (!post?.images?.length) return;
    setLightboxIndex((prev) => prev === post.images!.length - 1 ? 0 : prev + 1);
  };
  const handleTouchStart = (e: React.TouchEvent) => setTouchStartX(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX;
    if (diff > 50) showPrev(); else if (diff < -50) showNext();
    setTouchStartX(null);
  };

  const fetchQuizHistory = async () => {
    if (!user) return;
    setQuizHistoryLoading(true);
    const { data, error } = await supabase.from('quiz_performance_results' as any).select('*').eq('user_id', user.id).order('completed_at', { ascending: false }).limit(50);
    if (!error) setQuizHistory(data ?? []);
    setQuizHistoryLoading(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className={`${CARD} p-8 text-center`}>
          <p className="font-semibold text-slate-400">Please sign in to view your profile.</p>
        </div>
      </div>
    );
  }

  const displayName = profile?.username || user?.email?.split('@')[0] || 'Anonymous';

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container mx-auto px-4 pt-8 pb-20 lg:pb-8 max-w-4xl">

        {/* Mobile notifications bell */}
        <div className="flex justify-end mb-4 lg:hidden">
          <NotificationsBell />
        </div>

        {/* ── Profile Header ── */}
        <div className={`${CARD} mb-6`}>
          {/* Cover — avatar is absolutely centred on its bottom edge */}
          <div className="relative h-[200px] w-full">
            {profile?.cover_url ? (
              <img src={profile.cover_url} alt="Cover" className="absolute inset-0 w-full h-full object-cover cursor-zoom-in" onClick={() => setLightboxImage(profile.cover_url!)} />
            ) : (
              <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${C.indigo}, ${C.blue}, ${C.cyan})` }} />
            )}
            <div className="absolute inset-0 bg-black/25 pointer-events-none" />

            {/* Streak badge */}
            {streak > 0 && (
              <div className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full border-[2px] border-white/60 font-extrabold text-xs text-white" style={{ background: C.pop }}>
                <Flame className="w-3.5 h-3.5" /> {streak} day streak
              </div>
            )}

            {/* Cover upload button */}
            {isOwnProfile && (
              <label className="absolute bottom-3 right-3 w-8 h-8 rounded-full border-[2px] border-white bg-black/50 flex items-center justify-center cursor-pointer hover:bg-black/70 transition-colors">
                <Camera className="w-4 h-4 text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0]; if (!file || !user) return;
                  const filePath = `${user.id}/cover_${Date.now()}_${file.name}`;
                  const { error } = await supabase.storage.from('profile-images').upload(filePath, file, { upsert: true });
                  if (error) { toast({ title: 'Error', description: 'Failed to upload cover', variant: 'destructive' }); return; }
                  const { data: { publicUrl } } = supabase.storage.from('profile-images').getPublicUrl(filePath);
                  await supabase.from('profiles').update({ cover_url: publicUrl }).eq('user_id', user.id);
                  setProfile((prev) => prev ? { ...prev, cover_url: publicUrl } : prev);
                  toast({ title: 'Cover photo updated!' });
                }} />
              </label>
            )}

            {/* Avatar — sits on the bottom edge, half inside cover half below */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 z-10">
              <div className="relative">
                <Avatar
                  className="h-36 w-36 border-[4px] border-white cursor-zoom-in"
                  onClick={() => { if (profile?.avatar_url) setLightboxImage(profile.avatar_url); }}
                >
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className={`${DISPLAY} font-extrabold text-4xl`} style={{ background: C.cyan, color: C.ink }}>
                    {displayName[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div
                  className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-0.5 rounded-full border-[2px] border-[#0F172A] text-[11px] font-extrabold font-['Baloo_2'] text-white shadow-[1px_1px_0_0_#0F172A]"
                  style={{ background: C.indigo }}
                >
                  Student
                </div>
              </div>
            </div>
          </div>

          {/* Info — padding-top makes room for the half-avatar that hangs below cover */}
          <div className="px-6 pb-6 pt-24">
            <div className="flex flex-col items-center">
              <div className="text-center w-full max-w-md">
                <h1 className={`${DISPLAY} font-extrabold text-3xl leading-tight mb-1`}>{displayName}</h1>
                <p className="text-sm font-semibold text-slate-400 mb-5">
                  {profile?.bio || 'No bio yet.'}
                </p>

                {isOwnProfile ? (
                  <div className="flex flex-col items-center gap-3 w-full">
                    {/* Edit Profile */}
                    <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                      <DialogTrigger asChild>
                        <button className={`${BTN_OUTLINE} w-full max-w-xs`}>
                          <PenLine className="w-4 h-4" /> Edit Profile
                        </button>
                      </DialogTrigger>
                      <DialogContent className="border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[5px_5px_0_0_#0F172A]">
                        <DialogHeader>
                          <DialogTitle className={`${DISPLAY} font-extrabold text-lg`}>Edit Profile</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">Username</Label>
                            <input className={INPUT} value={editUsername} onChange={(e) => setEditUsername(e.target.value)} placeholder="Enter username" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">Bio</Label>
                            <Textarea
                              value={editBio}
                              onChange={(e) => setEditBio(e.target.value)}
                              placeholder="Tell us about yourself"
                              rows={3}
                              className="border-[2px] border-[#0F172A] rounded-[14px] shadow-[1px_1px_0_0_#0F172A] text-sm font-semibold focus-visible:ring-0 focus:shadow-[2px_2px_0_0_#0F172A] transition-shadow resize-none"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">Profile Picture</Label>
                            <input type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                              className="w-full text-sm font-semibold border-[2px] border-[#0F172A] rounded-[14px] px-3 py-2 bg-white cursor-pointer" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wide text-slate-500">Cover Photo</Label>
                            <input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)}
                              className="w-full text-sm font-semibold border-[2px] border-[#0F172A] rounded-[14px] px-3 py-2 bg-white cursor-pointer" />
                          </div>
                          <button className={`${BTN_PRIMARY} w-full`} style={{ background: C.indigo }} onClick={handleUpdateProfile} disabled={isUpdating}>
                            {isUpdating ? 'Saving…' : 'Save Changes'}
                          </button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Quiz History */}
                    <Dialog open={isQuizHistoryOpen} onOpenChange={(open) => { setIsQuizHistoryOpen(open); if (open) fetchQuizHistory(); }}>
                      <DialogTrigger asChild>
                        <button className={`${BTN_OUTLINE} w-full max-w-xs`}>
                          <BarChart2 className="w-4 h-4" /> Quiz History
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[5px_5px_0_0_#0F172A]">
                        <DialogHeader>
                          <DialogTitle className={`${DISPLAY} font-extrabold text-lg flex items-center gap-2`}>
                            <BarChart2 className="h-5 w-5" style={{ color: C.indigo }} /> Quiz Analysis History
                          </DialogTitle>
                        </DialogHeader>
                        {quizHistoryLoading ? (
                          <div className="space-y-3 py-4">
                            {[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full rounded-[14px]" />)}
                          </div>
                        ) : quizHistory.length === 0 ? (
                          <p className="text-sm font-semibold text-slate-400 py-8 text-center">No quiz history yet. Complete a quiz to see your results here.</p>
                        ) : (
                          <div className="space-y-3 py-2">
                            {quizHistory.map((result: any) => {
                              const ai = result.ai_analysis;
                              const score = Number(result.score);
                              return (
                                <div key={result.id} className="border-[2px] border-[#0F172A] rounded-[16px] shadow-[2px_2px_0_0_#0F172A] p-4 space-y-3 bg-white">
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <p className={`${DISPLAY} font-extrabold text-sm`}>{result.deck_name}</p>
                                      <p className="text-xs font-semibold text-slate-400">{result.category} · {new Date(result.completed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                    </div>
                                    <span className={`${DISPLAY} font-extrabold text-xl ${score >= 70 ? 'text-emerald-500' : score >= 40 ? 'text-orange-400' : 'text-red-500'}`}>
                                      {score.toFixed(1)}%
                                    </span>
                                  </div>
                                  <div className="flex gap-4 text-xs font-semibold">
                                    <span className="flex items-center gap-1 text-emerald-500"><CheckCircle className="h-3 w-3" /> {result.correct_count} correct</span>
                                    <span className="flex items-center gap-1 text-red-400"><XCircle className="h-3 w-3" /> {result.wrong_count} wrong</span>
                                    <span className="flex items-center gap-1 text-slate-400"><SkipForward className="h-3 w-3" /> {result.skipped_count} skipped</span>
                                    <span className="text-slate-400 ml-auto">{result.total_count} total</span>
                                  </div>
                                  {ai && (
                                    <div className="rounded-[12px] border-[2px] border-[#0F172A]/10 p-3 space-y-2 text-xs" style={{ background: C.skySoft }}>
                                      <p className={`${DISPLAY} font-extrabold text-sm flex items-center gap-1`} style={{ color: C.indigo }}>
                                        <BarChart2 className="h-3.5 w-3.5" /> AI Analysis
                                        {ai.overall_trend && (
                                          <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-bold border border-[#0F172A]/10 ${
                                            ai.overall_trend === 'improving' ? 'bg-emerald-100 text-emerald-700' :
                                            ai.overall_trend === 'declining' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                          }`}>
                                            {ai.overall_trend.replace('_', ' ')}
                                          </span>
                                        )}
                                      </p>
                                      {ai.performance_summary && <p className="text-slate-600 font-medium">{ai.performance_summary}</p>}
                                      {ai.weak_areas?.length > 0 && (
                                        <div>
                                          <p className="font-bold text-red-500 mb-1">Weak areas</p>
                                          <div className="flex flex-wrap gap-1">{ai.weak_areas.map((a: string, i: number) => <span key={i} className="px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-semibold">{a}</span>)}</div>
                                        </div>
                                      )}
                                      {ai.strong_areas?.length > 0 && (
                                        <div>
                                          <p className="font-bold text-emerald-600 mb-1">Strong areas</p>
                                          <div className="flex flex-wrap gap-1">{ai.strong_areas.map((a: string, i: number) => <span key={i} className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 font-semibold">{a}</span>)}</div>
                                        </div>
                                      )}
                                      {ai.improvement_tips?.length > 0 && (
                                        <div>
                                          <p className="font-bold mb-1">Tips</p>
                                          <ul className="list-disc list-inside space-y-0.5 text-slate-600 font-medium">{ai.improvement_tips.map((tip: string, i: number) => <li key={i}>{tip}</li>)}</ul>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </div>
                ) : (
                  profileUserId && <FollowButton targetUserId={profileUserId} />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Posts', value: posts.length, bg: C.skySoft, color: C.blue, onClick: undefined },
            { label: 'Followers', value: profile?.followers_count || 0, bg: C.indigoSoft, color: C.indigo, onClick: isOwnProfile ? () => setIsFollowersOpen(true) : undefined },
            { label: 'Following', value: profile?.following_count || 0, bg: C.mintSoft, color: '#059669', onClick: isOwnProfile ? () => setIsFollowingOpen(true) : undefined },
            { label: 'Streak', value: streak, bg: C.peach, color: C.pop, icon: <Flame className="w-4 h-4" />, onClick: undefined },
          ].map(({ label, value, bg, color, icon, onClick }) => (
            <div
              key={label}
              className={`border-[2.5px] border-[#0F172A] rounded-[18px] shadow-[3px_3px_0_0_#0F172A] text-center py-4 px-2 ${onClick ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_#0F172A] transition-all' : ''}`}
              style={{ background: bg }}
              onClick={onClick}
            >
              {icon ? (
                <div className="flex items-center justify-center gap-1 mb-0.5" style={{ color }}>
                  {icon}
                  <span className={`${DISPLAY} font-extrabold text-xl`}>{value}</span>
                </div>
              ) : (
                <div className={`${DISPLAY} font-extrabold text-xl mb-0.5`} style={{ color }}>{value}</div>
              )}
              <div className="text-xs font-bold text-slate-500">{label}</div>
            </div>
          ))}
        </div>

        {/* ── Streak Statistics ── */}
        <div className={`${CARD} mb-6`} style={{ background: C.lemon }}>
          <div className="p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-[12px] border-[2px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center shrink-0" style={{ background: C.pop }}>
                <Flame className="w-4 h-4 text-white" />
              </div>
              <p className={`${DISPLAY} font-extrabold text-lg`}>Streak Statistics</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="border-[2px] border-[#0F172A] rounded-[16px] shadow-[2px_2px_0_0_#0F172A] p-5 text-center bg-white">
                <Zap className="w-10 h-10 mx-auto mb-2" style={{ color: C.pop }} />
                <p className={`${DISPLAY} font-extrabold text-4xl`} style={{ color: C.pop }}>{streak}</p>
                <p className="text-xs font-semibold text-slate-500 mt-1">Current Streak</p>
              </div>
              <div className="border-[2px] border-[#0F172A] rounded-[16px] shadow-[2px_2px_0_0_#0F172A] p-5 text-center bg-white">
                <Target className="w-10 h-10 mx-auto mb-2" style={{ color: C.blue }} />
                <p className={`${DISPLAY} font-extrabold text-4xl`} style={{ color: C.blue }}>{streak}</p>
                <p className="text-xs font-semibold text-slate-500 mt-1">Best Streak</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Streak Leaderboard ── */}
        <div className="mb-6">
          <StreakLeaderboard currentUserId={user?.id} currentStreak={streak} />
        </div>

        {/* ── User Search ── */}
        <div className={`${CARD} mb-6`} style={{ background: C.lavender }}>
          <div className="p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-[12px] border-[2px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center shrink-0" style={{ background: C.cyan }}>
                <Search className="w-4 h-4" style={{ color: C.ink }} />
              </div>
              <p className={`${DISPLAY} font-extrabold text-lg`}>Search Users</p>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                placeholder="Search by username…"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); searchUsers(e.target.value); }}
                className={`${INPUT} pl-10`}
              />
            </div>
            {isSearching && <p className="text-xs font-semibold text-slate-400 px-1">Searching…</p>}
            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-hide">
                {searchResults.map((u) => (
                  <div key={u.id} className="flex items-center justify-between p-3 border-[2px] border-[#0F172A]/20 rounded-[14px] bg-white hover:border-[#0F172A]/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border-[2px] border-[#0F172A] shadow-[1px_1px_0_0_#0F172A]">
                        <AvatarImage src={u.avatar_url || undefined} />
                        <AvatarFallback className={`${DISPLAY} font-extrabold text-sm`} style={{ background: C.cyan, color: C.ink }}>
                          {u.username?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className={`${DISPLAY} font-extrabold text-sm`}>{u.username || 'Anonymous'}</p>
                        {u.bio && <p className="text-xs font-semibold text-slate-400 truncate max-w-48">{u.bio}</p>}
                      </div>
                    </div>
                    <FollowButton targetUserId={u.user_id} />
                  </div>
                ))}
              </div>
            )}
            {searchQuery && !isSearching && searchResults.length === 0 && (
              <p className="text-xs font-semibold text-slate-400 px-1">No users found for "{searchQuery}"</p>
            )}
          </div>
        </div>

        {/* ── Posts ── */}
        <div className="space-y-5">
          {!isOwnProfile && !isMutual && !isMutualLoading ? (
            <div className={`${CARD} py-16 flex flex-col items-center gap-4 text-center px-6`}>
              <div className="w-14 h-14 rounded-[18px] border-[2.5px] border-[#0F172A] shadow-[3px_3px_0_0_#0F172A] flex items-center justify-center" style={{ background: C.indigoSoft }}>
                <Lock className="w-6 h-6" style={{ color: C.indigo }} />
              </div>
              <div>
                <p className={`${DISPLAY} font-extrabold text-lg`}>Posts are private</p>
                <p className="text-sm font-semibold text-slate-400 mt-1 max-w-xs">
                  Follow each other to see <span className="font-bold text-[#0F172A]">{profile?.username || 'this user'}</span>'s posts.
                </p>
              </div>
              {profileUserId && <FollowButton targetUserId={profileUserId} />}
            </div>
          ) : (
            <>
              {isOwnProfile && <PostUpload onPostCreated={fetchPosts} />}

              {isLoading ? (
                <div className={CARD}>
                  <div className="p-5 space-y-3">
                    {[1,2].map(i => <Skeleton key={i} className="h-32 w-full rounded-[14px]" />)}
                  </div>
                </div>
              ) : posts.length === 0 ? (
                <div className={`${CARD} py-12 flex flex-col items-center gap-3 text-center px-6`}>
                  <div className="w-12 h-12 rounded-[14px] border-[2.5px] border-[#0F172A] shadow-[2px_2px_0_0_#0F172A] flex items-center justify-center" style={{ background: C.skySoft }}>
                    <GraduationCap className="w-5 h-5" style={{ color: C.indigo }} />
                  </div>
                  <p className={`${DISPLAY} font-extrabold text-base`}>No posts yet</p>
                  {isOwnProfile && <p className="text-sm font-semibold text-slate-400">Create your first post above!</p>}
                </div>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => {
                    const hasGalleryImages = !!(post.images && post.images.length);
                    const gallery = (post.images?.map((img) => img.file_url) ?? []).concat(!hasGalleryImages && post.image_url ? [post.image_url] : []);
                    return (
                      <article key={post.id} className={`${CARD}`}>
                        {/* Header */}
                        <div className="flex items-center gap-3 px-4 py-3">
                          <Avatar className="h-9 w-9 border-[2px] border-[#0F172A] shadow-[1px_1px_0_0_#0F172A] flex-shrink-0">
                            <AvatarImage src={profile?.avatar_url || undefined} />
                            <AvatarFallback className={`${DISPLAY} font-extrabold text-sm`} style={{ background: C.cyan, color: C.ink }}>
                              {displayName[0]?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className={`${DISPLAY} font-extrabold text-sm leading-tight truncate`}>{displayName}</p>
                            <p className="text-[11px] font-semibold text-slate-500">
                              {new Date(post.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                          {isOwnProfile && (
                            <button
                              onClick={() => deletePost(post.id)}
                              className="h-8 w-8 rounded-full border-[2px] border-[#0F172A]/20 bg-white/70 flex items-center justify-center hover:border-red-300 hover:bg-red-50 transition-colors flex-shrink-0"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-slate-400" />
                            </button>
                          )}
                        </div>

                        {gallery.length > 0 && (
                          <div className="border-y-[2px] border-[#0F172A]/10">
                            <PostImageCarousel images={gallery} onImageClick={hasGalleryImages ? (idx) => openLightbox(post.id, idx) : undefined} />
                          </div>
                        )}

                        <div className="flex items-center gap-0.5 px-3 pt-2 pb-1">
                          <LikeButton postId={post.id} likesCount={post.likes_count} onLikeChange={(n) => setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, likes_count: n } : p))} />
                          <CommentSection postId={post.id} commentsCount={post.comments_count} onCommentChange={(n) => setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, comments_count: n } : p))} />
                        </div>

                        {post.content && (
                          <p className="px-4 pb-2 text-sm font-medium leading-snug">
                            <span className={`${DISPLAY} font-extrabold mr-1.5`}>{displayName}</span>
                            {post.content}
                          </p>
                        )}

                        {post.tags.length > 0 && (
                          <div className="px-4 pb-3 flex flex-wrap gap-x-2 gap-y-1">
                            {post.tags.map((tag, i) => (
                              <span key={i} className="text-xs font-bold" style={{ color: C.indigo }}>#{tag}</span>
                            ))}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Followers / Following dialogs */}
        <Dialog open={isFollowersOpen} onOpenChange={setIsFollowersOpen}>
          <DialogContent className="max-w-sm max-h-[70vh] overflow-y-auto border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[4px_4px_0_0_#0F172A]">
            <DialogHeader><DialogTitle className={`${DISPLAY} font-extrabold`}>Followers</DialogTitle></DialogHeader>
            <UsersList title="" userIds={followers} showAll />
          </DialogContent>
        </Dialog>
        <Dialog open={isFollowingOpen} onOpenChange={setIsFollowingOpen}>
          <DialogContent className="max-w-sm max-h-[70vh] overflow-y-auto border-[2.5px] border-[#0F172A] rounded-[20px] shadow-[4px_4px_0_0_#0F172A]">
            <DialogHeader><DialogTitle className={`${DISPLAY} font-extrabold`}>Following</DialogTitle></DialogHeader>
            <UsersList title="" userIds={following} showAll />
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Profile image lightbox ── */}
      {lightboxImage && createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)' }} onClick={() => setLightboxImage(null)}>
          <button type="button" className="absolute top-4 right-5 text-white/70 hover:text-white text-2xl leading-none z-10 transition-colors" onClick={() => setLightboxImage(null)} aria-label="Close">✕</button>
          <img src={lightboxImage} alt="Full size" className="max-w-[92vw] max-h-[88vh] object-contain rounded-2xl shadow-2xl lb-zoom-in" onClick={(e) => e.stopPropagation()} />
        </div>,
        document.body
      )}

      {/* ── Post image lightbox ── */}
      {lightboxPostId && (() => {
        const post = posts.find((p) => p.id === lightboxPostId);
        if (!post?.images?.length) return null;
        const currentImage = post.images[lightboxIndex];
        if (!currentImage) return null;
        return createPortal(
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
            <button type="button" className="absolute top-4 right-4 text-white text-2xl" onClick={closeLightbox}>✕</button>
            <button type="button" className="absolute left-4 md:left-8 text-white text-4xl" onClick={showPrev}>‹</button>
            <button type="button" className="absolute right-4 md:right-8 text-white text-4xl" onClick={showNext}>›</button>
            <div className="max-w-5xl w-full px-4" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
              <img src={currentImage.file_url} alt="Post image" className="w-full max-h-[80vh] object-contain mx-auto" />
            </div>
          </div>,
          document.body
        );
      })()}
    </div>
  );
};
