import { supabase, isLiveSupabaseConfigured } from '../lib/supabase';
import { User, Session } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
}

const LOCAL_STORAGE_USER_KEY = 'idforge_demo_user';

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

    // Fallback demo user
    const localUser = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
    if (localUser) {
      try {
        return JSON.parse(localUser);
      } catch {
        // ignore
      }
    }

    return {
      id: 'user-0001',
      email: 'admin@idforge.com',
      fullName: 'Dr. Sarah Jenkins',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80',
    };
  },

  async signUp(email: string, password: string, fullName: string): Promise<{ success: boolean; user?: User; error?: string }> {
    if (isLiveSupabaseConfigured) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        localStorage.setItem(
          LOCAL_STORAGE_USER_KEY,
          JSON.stringify({
            id: data.user.id,
            email: data.user.email,
            fullName,
          })
        );
      }

      return { success: true, user: data.user || undefined };
    }

    // Local demo signup
    const mockUser: AuthUser = {
      id: `usr-${Date.now()}`,
      email,
      fullName,
    };
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(mockUser));
    return { success: true };
  },

  async signInWithPassword(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    if (isLiveSupabaseConfigured) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        localStorage.setItem(
          LOCAL_STORAGE_USER_KEY,
          JSON.stringify({
            id: data.user.id,
            email: data.user.email,
            fullName: data.user.user_metadata?.full_name || email.split('@')[0],
          })
        );
      }

      return { success: true };
    }

    // Local demo login
    const mockUser: AuthUser = {
      id: `usr-${Date.now()}`,
      email,
      fullName: email.split('@')[0],
    };
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(mockUser));
    return { success: true };
  },

  async signInWithGoogle(): Promise<{ success: boolean; error?: string }> {
    if (isLiveSupabaseConfigured) {
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
    }

    // Local demo
    const mockUser: AuthUser = {
      id: 'google-usr-01',
      email: 'user.google@gmail.com',
      fullName: 'Google User',
    };
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(mockUser));
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
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
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
