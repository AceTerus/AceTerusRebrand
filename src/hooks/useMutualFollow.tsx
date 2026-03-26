import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/**
 * Checks whether the current user and targetUserId follow each other mutually.
 * Returns `isMutual = true` when A→B AND B→A both exist in the follows table.
 */
export const useMutualFollow = (targetUserId?: string) => {
  const { user } = useAuth();
  const [isMutual, setIsMutual] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Own profile or missing params — treat as "open"
    if (!user || !targetUserId || user.id === targetUserId) {
      setIsMutual(true);
      setIsLoading(false);
      return;
    }

    const check = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from('follows')
        .select('follower_id, followed_id')
        .or(
          `and(follower_id.eq.${user.id},followed_id.eq.${targetUserId}),and(follower_id.eq.${targetUserId},followed_id.eq.${user.id})`
        );

      // Both directions must exist → 2 rows
      setIsMutual((data?.length ?? 0) >= 2);
      setIsLoading(false);
    };

    check();
  }, [user, targetUserId]);

  return { isMutual, isLoading };
};

/**
 * Returns the list of user IDs that the current user mutually follows.
 * Used to filter contacts/uploads to mutual connections only.
 */
export const fetchMutualFollowIds = async (userId: string): Promise<string[]> => {
  const [{ data: iFollow }, { data: followMe }] = await Promise.all([
    supabase.from('follows').select('followed_id').eq('follower_id', userId),
    supabase.from('follows').select('follower_id').eq('followed_id', userId),
  ]);

  const iFollowSet = new Set(iFollow?.map(f => f.followed_id) ?? []);
  const followMeSet = new Set(followMe?.map(f => f.follower_id) ?? []);

  return [...iFollowSet].filter(id => followMeSet.has(id));
};
