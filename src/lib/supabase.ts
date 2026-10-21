import { createClient } from '@supabase/supabase-js';

const DEFAULT_SUPABASE_URL = 'https://wquejiogjajvmfalnxbl.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxdWVqaW9namFqdm1mYWxueGJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIyMDQ0ODIsImV4cCI6MjEwNzc4MDQ4Mn0.thXa1XUHcD1yrY9Pz4gtHQ-MKut3PcOsDByvezxmYto';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const isLiveSupabaseConfigured =
  Boolean(supabaseUrl) &&
  supabaseUrl !== 'https://placeholder-project.supabase.co' &&
  supabaseUrl !== 'https://your-project.supabase.co' &&
  Boolean(supabaseAnonKey) &&
  supabaseAnonKey !== 'placeholder-anon-key' &&
  supabaseAnonKey !== 'your-anon-publishable-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
