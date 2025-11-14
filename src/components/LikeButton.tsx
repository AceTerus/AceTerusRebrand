import { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface LikeButtonProps {
  postId: string;
  likesCount: number;
  onLikeChange: (newCount: number) => void;
}

export const LikeButton = ({ postId, likesCount, onLikeChange }: LikeButtonProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      checkIfLiked();
    }
  }, [user, postId]);

  const checkIfLiked = async () => {
    if (!user) return;

    const { data } = await supabase
      .from("likes")
      .select("id")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .maybeSingle();

    setIsLiked(!!data);
  };

  const handleLike = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to like posts",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      if (isLiked) {
        // Unlike
        await supabase
          .from("likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);

        setIsLiked(false);
        onLikeChange(likesCount - 1);
      } else {
        // Like
        await supabase
          .from("likes")
          .insert({ post_id: postId, user_id: user.id });

        setIsLiked(true);
        onLikeChange(likesCount + 1);
      }
    } catch (error) {
      console.error("Error toggling like:", error);
      toast({
        title: "Error",
        description: "Failed to update like",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLike}
      disabled={isLoading}
      className="flex items-center space-x-1 hover:text-primary"
    >
      <Heart
        className={`w-4 h-4 transition-colors ${
          isLiked ? "fill-primary text-primary" : ""
        }`}
      />
      <span className="text-sm">{likesCount}</span>
    </Button>
  );
};
