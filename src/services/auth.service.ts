import { supabase, isLiveSupabaseConfigured } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
}

export const authService = {
  async getSession(): Promise<Session | null> {
    if (isLiveSupabaseConfigured) {
      try {
        const { data } = await supabase.auth.getSession();
        return data.session;
      } catch (err) {
        console.warn('Supabase getSession error:', err);
      }
    }
    return null;
  },

  async getCurrentUser(): Promise<AuthUser | null> {
    if (isLiveSupabaseConfigured) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          return {
            id: user.id,
            email: user.email || '',
            fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            avatarUrl: user.user_metadata?.avatar_url,
          };
        }
      } catch (err) {
        console.warn('Supabase getUser error:', err);
      }
    }

    return null;
  },

  async signUp(email: string, password: string, fullName: string): Promise<{ success: boolean; user?: User; error?: string }> {
    if (!isLiveSupabaseConfigured) {
      return { success: false, error: 'Supabase credentials are not configured in .env' };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, user: data.user || undefined };
  },

  async signInWithPassword(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    if (!isLiveSupabaseConfigured) {
      return { success: false, error: 'Supabase credentials are not configured in .env' };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  },

  async signInWithGoogle(): Promise<{ success: boolean; error?: string }> {
    if (!isLiveSupabaseConfigured) {
      return { success: false, error: 'Supabase credentials are not configured in .env' };
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  },

  async signOut(): Promise<void> {
    if (isLiveSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Sign out error:', e);
      }
    }
  },

  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    if (isLiveSupabaseConfigured) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          callback({
            id: session.user.id,
            email: session.user.email || '',
            fullName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
            avatarUrl: session.user.user_metadata?.avatar_url,
          });
        } else {
          callback(null);
        }
      });
      return subscription;
    }
    return { unsubscribe: () => {} };
  },
};
