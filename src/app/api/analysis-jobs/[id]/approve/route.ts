import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createSupabaseServerClient } from '@/lib/supabase/server';

const approveSchema = z.object({
  name: z.string().min(1),
  business_item_registrant_name: z.string().optional().nullable(),
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

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });

  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const payload = approveSchema.parse(await request.json());
  const job = await supabase.from('analysis_jobs').select('*').eq('id', id).single();
  if (job.error) return NextResponse.json({ error: job.error.message }, { status: 404 });
  if (job.data.status !== 'review_required') {
    return NextResponse.json({ error: 'レビュー待ちの解析ジョブのみ承認できます。' }, { status: 400 });
  }

  const property = await supabase
    .from('properties')
    .insert({ ...payload, created_by: userResult.user.id, updated_by: userResult.user.id, analyzed_at: new Date().toISOString() })
    .select('*')
    .single();

  if (property.error) return NextResponse.json({ error: property.error.message }, { status: 400 });

  await supabase
    .from('property_documents')
    .update({ property_id: property.data.id })
    .eq('id', job.data.document_id ?? '');

  const updatedJob = await supabase
    .from('analysis_jobs')
    .update({
      status: 'completed',
      approved_property_id: property.data.id,
      approved_by: userResult.user.id,
      completed_at: new Date().toISOString()
    })
    .eq('id', id)
    .select('*')
    .single();

  await supabase.from('audit_logs').insert({
    actor_id: userResult.user.id,
    action: 'analysis.approve',
    entity_type: 'analysis_job',
    entity_id: id,
    before_data: job.data,
    after_data: updatedJob.data
  });

  return NextResponse.json({ data: property.data, job: updatedJob.data }, { status: 201 });
}
