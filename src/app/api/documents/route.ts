import { NextResponse } from 'next/server';

import { analyzePropertyPdf } from '@/lib/gemini';
import { fillCoordinatesIfMissing } from '@/lib/geocoding';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });

  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'PDF file is required.' }, { status: 400 });
  }

  if (file.type && file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'PDFのみアップロードできます。' }, { status: 400 });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${userResult.user.id}/${Date.now()}-${safeName}`;

  const upload = await supabase.storage.from('property-documents').upload(storagePath, file, {
    contentType: file.type || 'application/pdf',
    upsert: false
  });

  if (upload.error) return NextResponse.json({ error: upload.error.message }, { status: 400 });

  const documentResult = await supabase
    .from('property_documents')
    .insert({
      source: 'supabase_storage',
      storage_bucket: 'property-documents',
      storage_path: storagePath,
      original_filename: file.name,
      mime_type: file.type || 'application/pdf',
      file_size: file.size,
      created_by: userResult.user.id
    })
    .select('*')
    .single();

  if (documentResult.error) return NextResponse.json({ error: documentResult.error.message }, { status: 400 });

  const jobResult = await supabase
    .from('analysis_jobs')
    .insert({
      document_id: documentResult.data.id,
      status: 'processing',
      requested_by: userResult.user.id
    })
    .select('*')
    .single();

  if (jobResult.error) return NextResponse.json({ error: jobResult.error.message }, { status: 400 });

  try {
    const extracted = await fillCoordinatesIfMissing(await analyzePropertyPdf(file));
    const updated = await supabase
      .from('analysis_jobs')
      .update({ status: 'review_required', extracted_payload: extracted })
      .eq('id', jobResult.data.id)
      .select('*')
      .single();

    if (updated.error) return NextResponse.json({ error: updated.error.message }, { status: 400 });
    return NextResponse.json({ data: updated.data, document: documentResult.data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'PDF解析に失敗しました。';
    const failed = await supabase
      .from('analysis_jobs')
      .update({ status: 'failed', error_message: message, completed_at: new Date().toISOString() })
      .eq('id', jobResult.data.id)
      .select('*')
      .single();

    return NextResponse.json({ data: failed.data, error: message }, { status: 202 });
  }
}
