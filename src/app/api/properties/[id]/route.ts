import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { isSupabaseConfigured } from '@/lib/env';
import { seedProperties } from '@/lib/seed-properties';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  business_item_registrant_name: z.string().optional().nullable(),
  asset_type: z.string().optional().nullable(),
  address: z.string().min(1).optional(),
  price_amount_yen: z.number().int().nonnegative().optional().nullable(),
  price_raw_text: z.string().optional().nullable(),
  land_area_sqm: z.number().optional().nullable(),
  floor_area_sqm: z.number().optional().nullable(),
  zoning: z.string().optional().nullable(),
  coverage_ratio_raw: z.string().optional().nullable(),
  road_access: z.string().optional().nullable(),
  transaction_type: z.string().optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  notes: z.string().optional().nullable(),
  visibility: z.enum(['internal', 'external']).optional()
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  if (!isSupabaseConfigured()) {
    const property = seedProperties.find((item) => item.id === id);
    if (!property) return NextResponse.json({ error: 'Property not found.' }, { status: 404 });
    return NextResponse.json({ data: property, documents: [], source: 'seed' });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });

  const { data, error } = await supabase.from('properties').select('*').eq('id', id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  const { data: documents } = await supabase.from('property_documents').select('*').eq('property_id', id).order('created_at', { ascending: false });
  return NextResponse.json({ data, documents: documents ?? [], source: 'supabase' });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });

  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const payload = updateSchema.parse(await request.json());
  const before = await supabase.from('properties').select('*').eq('id', id).single();
  if (before.error) return NextResponse.json({ error: before.error.message }, { status: 404 });

  const { data, error } = await supabase
    .from('properties')
    .update({ ...payload, updated_by: userResult.user.id })
    .eq('id', id)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabase.from('audit_logs').insert({
    actor_id: userResult.user.id,
    action: 'property.update',
    entity_type: 'property',
    entity_id: id,
    before_data: before.data,
    after_data: data
  });

  return NextResponse.json({ data });
}
