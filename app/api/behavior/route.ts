import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('user_behavior')
      .select('*')
      .eq('user_id', user.id)
      .order('success_rate', { ascending: true }); // weakest first

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ behavior: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
