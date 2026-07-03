import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { isSupabaseConfigured } from '@/lib/env';
import { filterSeedProperties, priceRangeToBounds, toNumber } from '@/lib/property-filters';
import { seedProperties } from '@/lib/seed-properties';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const propertyInputSchema = z.object({
  name: z.string().min(1),
  asset_type: z.string().optional().nullable(),
  address: z.string().min(1),
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
  visibility: z.enum(['internal', 'external']).default('internal')
});

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const filters = {
    q: params.get('q'),
    price: params.get('price'),
    transactionType: params.get('transactionType'),
    assetType: params.get('assetType'),
    north: toNumber(params.get('north')),
    south: toNumber(params.get('south')),
    east: toNumber(params.get('east')),
    west: toNumber(params.get('west'))
  };

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      data: filterSeedProperties(seedProperties, filters),
      source: 'seed'
    });
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ data: [], source: 'unconfigured' });
  }

  const bounds = priceRangeToBounds(filters.price);
  const { data, error } = await supabase.rpc('search_properties', {
    search_text: filters.q ?? null,
    min_price: bounds.minPrice,
    max_price: bounds.maxPrice,
    transaction_type_filter: filters.transactionType || null,
    asset_type_filter: filters.assetType || null,
    north: filters.north,
    south: filters.south,
    east: filters.east,
    west: filters.west
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = bounds.unknownOnly ? (data ?? []).filter((property) => property.price_amount_yen === null) : data ?? [];
  return NextResponse.json({ data: rows, source: 'supabase' });
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });
  }

  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  const payload = propertyInputSchema.parse(await request.json());
  const { data, error } = await supabase
    .from('properties')
    .insert({ ...payload, created_by: userResult.user.id, updated_by: userResult.user.id })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await supabase.from('audit_logs').insert({
    actor_id: userResult.user.id,
    action: 'property.create',
    entity_type: 'property',
    entity_id: data.id,
    after_data: data
  });

  return NextResponse.json({ data }, { status: 201 });
}
