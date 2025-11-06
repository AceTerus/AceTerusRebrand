import { Button } from '@/components/ui/button';
import { useFollow } from '@/hooks/useFollow';
import { useAuth } from '@/hooks/useAuth';

interface FollowButtonProps {
  targetUserId: string;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
}

export const FollowButton = ({ targetUserId, size = 'default', variant = 'default' }: FollowButtonProps) => {
  const { user } = useAuth();
  const { isFollowing, isLoading, toggleFollow } = useFollow(targetUserId);

  if (!user || user.id === targetUserId) {
    return null;
  }

  return (
    <Button
      onClick={toggleFollow}
      disabled={isLoading}
      size={size}
      variant={isFollowing ? 'outline' : variant}
    >
      {isLoading ? 'Loading...' : isFollowing ? 'Following' : 'Follow'}
    </Button>
  );
};