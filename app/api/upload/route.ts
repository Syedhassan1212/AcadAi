import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { runFilePipeline } from '@/lib/files/pipeline';

export const maxDuration = 120; // 2 minutes for processing

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const MAX_SIZE = 20 * 1024 * 1024; // 20MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 20MB)' }, { status: 400 });
    }

    const supportedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
    ];
    if (!supportedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type. Use PDF, DOCX, or TXT' }, { status: 400 });
    }

    // Get user's weak topics for task generation optimization
    const { data: behaviors } = await supabase
      .from('user_behavior')
      .select('topic, success_rate')
      .eq('user_id', user.id)
      .lt('success_rate', 0.5);

    const weakTopics = (behaviors ?? []).map((b: any) => b.topic);

    // Upload to Supabase Storage
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const storagePath = `${user.id}/${Date.now()}-${file.name}`;

    const { error: storageErr } = await supabase.storage
      .from(process.env.SUPABASE_STORAGE_BUCKET ?? 'study-files')
      .upload(storagePath, buffer, { contentType: file.type });

    if (storageErr && !storageErr.message.includes('already exists')) {
      console.error('Storage upload error:', storageErr);
    }

    // Run full pipeline
    const result = await runFilePipeline(
      buffer,
      file.name,
      file.type,
      user.id,
      supabase,
      weakTopics
    );

    return NextResponse.json({
      success: true,
      message: `Processed "${file.name}" — found ${result.extractedTopics.length} topics, generated ${result.generatedTaskCount} tasks`,
      ...result,
    });
  } catch (err: any) {
    console.error('Upload API error:', err);
    return NextResponse.json({ error: err.message ?? 'Processing failed' }, { status: 500 });
  }
}
