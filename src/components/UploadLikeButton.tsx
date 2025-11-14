import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UploadLikeButtonProps {
  uploadId: string;
  likesCount: number;
  onLikeChange: (newCount: number) => void;
}

export const UploadLikeButton = ({ uploadId, likesCount, onLikeChange }: UploadLikeButtonProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      checkIfLiked();
    }
  }, [user, uploadId]);

  const checkIfLiked = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('upload_likes')
        .select('id')
        .eq('upload_id', uploadId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking like status:', error);
        return;
      }

      setIsLiked(!!data);
    } catch (error) {
      console.error('Error checking like status:', error);
    }
  };

  const handleLike = async () => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to like materials',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      if (isLiked) {
        const { error } = await supabase
          .from('upload_likes')
          .delete()
          .eq('upload_id', uploadId)
          .eq('user_id', user.id);

        if (error) throw error;

        setIsLiked(false);
        onLikeChange(likesCount - 1);
      } else {
        const { error } = await supabase
          .from('upload_likes')
          .insert({ upload_id: uploadId, user_id: user.id });

        if (error) throw error;

        setIsLiked(true);
        onLikeChange(likesCount + 1);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        title: 'Error',
        description: 'Failed to update like',
        variant: 'destructive',
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
      className="gap-1"
    >
      <Heart
        className={`h-4 w-4 ${isLiked ? 'fill-red-500 text-red-500' : ''}`}
      />
      <span>{likesCount}</span>
    </Button>
  );
};
