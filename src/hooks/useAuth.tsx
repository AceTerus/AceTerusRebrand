import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  isNewUser: boolean;
  aceCoins: number;
  setAceCoins: React.Dispatch<React.SetStateAction<number>>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [aceCoins, setAceCoins] = useState<number>(0);

  useEffect(() => {
    const syncProfile = async (userId: string | undefined) => {
      if (!userId) { setIsAdmin(false); setAceCoins(0); return; }
      
      const { data, error } = await supabase
        .from("profiles")
        .select("is_admin, ace_coins, username")
        .eq("user_id", userId)
        .single();

      if (error && error.code === 'PGRST116') {
        // Profile does not exist yet — brand new user.
        try {
          await (supabase as any).from('profiles').insert([{ user_id: userId, ace_coins: 1000 }]);
          setIsAdmin(false);
          setAceCoins(1000);
          setIsNewUser(true);
        } catch (e) {
          console.error("Failed to create default profile:", e);
        }
        return;
      }

      setIsAdmin((data as any)?.is_admin ?? false);
      setIsNewUser(!(data as any)?.username);
      
      let coins = (data as any)?.ace_coins ?? 0;
      if (coins < 1000) {
        // Auto-grant 1000 ACE Coins for new players or those stuck at 0 
        try {
          await (supabase as any).from('profiles').update({ ace_coins: 1000 }).eq('user_id', userId);
          coins = 1000;
        } catch (e) {
          console.error("Failed to airdrop default coins:", e);
        }
      }
      setAceCoins(coins);
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
        syncProfile(session?.user?.id);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
      syncProfile(session?.user?.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
      return;
    }
    setIsAdmin(false);
  };

  const value = {
    user,
    session,
    isLoading,
    isAdmin,
    isNewUser,
    aceCoins,
    setAceCoins,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};