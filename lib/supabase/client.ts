'use client';

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    if (typeof window !== 'undefined') {
      console.error("🔍 AcadAi Debug: Supabase configuration is MISSING in the browser bundle.");
      console.log("URL:", url ? "Set" : "Missing");
      console.log("Key:", anonKey ? "Set" : "Missing");
    }
    // Return a mock client during build or if config is missing to prevent total app crashes
    return {
      auth: {
        signInWithOAuth: async () => ({ error: new Error("Supabase URL or Anon Key is missing. Check your environment variables.") }),
        signInWithPassword: async () => ({ error: new Error("Supabase URL or Anon Key is missing. Check your environment variables.") }),
        signUp: async () => ({ error: new Error("Supabase URL or Anon Key is missing. Check your environment variables.") }),
        signOut: async () => ({ error: new Error("Supabase URL or Anon Key is missing. Check your environment variables.") }),
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
      from: () => ({
        select: () => ({
          order: () => ({
            limit: () => Promise.resolve({ data: [], error: null })
          }),
          eq: () => Promise.resolve({ data: [], error: null }),
        }),
        insert: () => Promise.resolve({ data: null, error: null }),
        update: () => Promise.resolve({ data: null, error: null }),
        delete: () => Promise.resolve({ data: null, error: null }),
      }),
    } as any;
  }

  return createBrowserClient(url, anonKey);
}
