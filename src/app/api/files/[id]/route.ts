import { NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/lib/supabase/server';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });

  const { data, error } = await supabase.from('property_documents').select('*').eq('id', id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  if (data.source === 'google_drive') {
    return NextResponse.json({ url: data.url, source: data.source });
  }

  if (!data.storage_path || !data.storage_bucket) {
    return NextResponse.json({ error: 'Storage path is missing.' }, { status: 400 });
  }

  const signed = await supabase.storage.from(data.storage_bucket).createSignedUrl(data.storage_path, 60 * 10);
  if (signed.error) return NextResponse.json({ error: signed.error.message }, { status: 400 });

  return NextResponse.json({ url: signed.data.signedUrl, source: data.source });
}
