import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Prioritize the configured APP_URL for redirects, falling back to request origin
      const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || origin).replace(/\/$/, '');
      return NextResponse.redirect(`${baseUrl}${next}`);
    } else {
      console.error('Error exchanging code for session:', error.message);
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate user`);
}
