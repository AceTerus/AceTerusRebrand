import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

interface PreviewComment {
  id: string;
  content: string;
  user_id: string;
  profiles: { username: string; avatar_url: string };
}

interface CommentPreviewProps {
  postId: string;
  commentsCount: number;
  /** called when the "View all" text is clicked — lets parent open full comments */
  onViewAll?: () => void;
}

export const CommentPreview = ({ postId, commentsCount, onViewAll }: CommentPreviewProps) => {
  const [preview, setPreview] = useState<PreviewComment[]>([]);

  useEffect(() => {
    if (commentsCount === 0) { setPreview([]); return; }
    let cancelled = false;

    (async () => {
      const { data } = await supabase
        .from("comments")
        .select("id, content, user_id, created_at")
        .eq("post_id", postId)
        .order("created_at", { ascending: false })
        .limit(2);

      if (cancelled || !data?.length) return;

      const uids = [...new Set(data.map((c: any) => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, avatar_url")
        .in("user_id", uids);

      const map = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      if (!cancelled)
        setPreview(data.map((c: any) => ({
          ...c,
          profiles: map.get(c.user_id) ?? { username: "Someone", avatar_url: "" },
        })));
    })();

    return () => { cancelled = true; };
  }, [postId, commentsCount]);

  if (commentsCount === 0 || preview.length === 0) return null;

  return (
    <div className="px-4 pb-3">
      {/* "View all X comments" */}
      {commentsCount > 2 && (
        <button
          onClick={onViewAll}
          className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors block mb-1.5"
        >
          View all {commentsCount} comments
        </button>
      )}

      {/* Latest 2 comments — indented with left border to distinguish from caption */}
      <div className="ml-3 pl-3 border-l-[2.5px] border-slate-200 space-y-1.5">
        {[...preview].reverse().map((c) => (
          <p key={c.id} className="text-sm leading-snug line-clamp-2">
            <Link
              to={`/profile/${c.user_id}`}
              className="font-extrabold font-['Baloo_2'] mr-1.5 hover:underline text-[#0F172A]"
            >
              {c.profiles.username}
            </Link>
            <span className="text-slate-500">{c.content}</span>
          </p>
        ))}
      </div>
    </div>
  );
};
