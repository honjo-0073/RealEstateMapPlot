import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { geocodeAddress } from '@/lib/geocoding';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const geocodeSchema = z.object({
  address: z.string().min(1)
});

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });

  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const payload = geocodeSchema.parse(await request.json());
  const result = await geocodeAddress(payload.address);

  if (!result) {
    return NextResponse.json({ error: '住所から緯度経度を取得できませんでした。住所を確認するか、緯度経度を手入力してください。' }, { status: 404 });
  }

  return NextResponse.json({ data: result });
}
