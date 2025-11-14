import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle } from 'lucide-react';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  profiles: {
    username: string | null;
    avatar_url: string | null;
  } | null;
}

interface UploadCommentSectionProps {
  uploadId: string;
  commentsCount: number;
  onCommentChange: (newCount: number) => void;
}

export const UploadCommentSection = ({ uploadId, commentsCount, onCommentChange }: UploadCommentSectionProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isVisible) {
      fetchComments();
    }
  }, [isVisible, uploadId]);

  const fetchComments = async () => {
    try {
      const { data: commentsData, error } = await supabase
        .from('upload_comments')
        .select('id, content, created_at, user_id')
        .eq('upload_id', uploadId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching comments:', error);
        return;
      }

      if (!commentsData) {
        setComments([]);
        return;
      }

      // Fetch profiles separately
      const userIds = [...new Set(commentsData.map(c => c.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url')
        .in('user_id', userIds);

      const profilesMap = new Map(
        profilesData?.map(p => [p.user_id, p]) || []
      );

      const commentsWithProfiles = commentsData.map(comment => ({
        ...comment,
        profiles: profilesMap.get(comment.user_id) || null,
      }));

      setComments(commentsWithProfiles);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleSubmitComment = async () => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to comment',
        variant: 'destructive',
      });
      return;
    }

    if (!newComment.trim()) {
      toast({
        title: 'Error',
        description: 'Comment cannot be empty',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('upload_comments')
        .insert({
          upload_id: uploadId,
          user_id: user.id,
          content: newComment.trim(),
        });

      if (error) throw error;

      setNewComment('');
      onCommentChange(commentsCount + 1);
      fetchComments();

      toast({
        title: 'Success',
        description: 'Comment added',
      });
    } catch (error) {
      console.error('Error posting comment:', error);
      toast({
        title: 'Error',
        description: 'Failed to post comment',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  return (
    <div className="space-y-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsVisible(!isVisible)}
        className="gap-1"
      >
        <MessageCircle className="h-4 w-4" />
        <span>{commentsCount}</span>
      </Button>

      {isVisible && (
        <div className="space-y-3 mt-2 p-3 bg-muted/30 rounded-lg">
          {user && (
            <div className="flex gap-2">
              <Textarea
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="min-h-[60px] text-sm"
              />
              <Button
                onClick={handleSubmitComment}
                disabled={isLoading || !newComment.trim()}
                size="sm"
              >
                Post
              </Button>
            </div>
          )}

          <div className="space-y-2">
            {comments.length === 0 ? (
              <p className="text-xs text-muted-foreground">No comments yet</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="bg-background p-2 rounded text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold">
                      {comment.profiles?.username || 'Anonymous'}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {formatDate(comment.created_at)}
                    </span>
                  </div>
                  <p className="text-foreground">{comment.content}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
