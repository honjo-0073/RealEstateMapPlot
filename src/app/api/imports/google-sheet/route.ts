import { NextResponse } from 'next/server';

import { canAdmin, getCurrentProfile } from '@/lib/auth';
import { extractDriveFileId, seedDocumentUrls } from '@/lib/seed-documents';
import { seedProperties } from '@/lib/seed-properties';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });

  const profile = await getCurrentProfile();
  if (!canAdmin(profile?.role)) {
    return NextResponse.json({ error: 'Admin role is required.' }, { status: 403 });
  }

  const results: Array<{ rowId: string | null; action: 'created' | 'skipped'; propertyId?: string }> = [];

  for (const seed of seedProperties) {
    const existing = await supabase
      .from('properties')
      .select('id')
      .eq('source_google_sheet_row_id', seed.source_google_sheet_row_id)
      .maybeSingle();

    if (existing.data) {
      results.push({ rowId: seed.source_google_sheet_row_id, action: 'skipped', propertyId: existing.data.id });
      continue;
    }

    const { id: _seedId, created_at: _createdAt, updated_at: _updatedAt, ...propertyPayload } = seed;
    const property = await supabase
      .from('properties')
      .insert({ ...propertyPayload, created_by: profile!.id, updated_by: profile!.id })
      .select('*')
      .single();

    if (property.error) {
      return NextResponse.json({ error: property.error.message, results }, { status: 400 });
    }

    const rowId = seed.source_google_sheet_row_id ?? '';
    const url = seedDocumentUrls[rowId];
    if (url) {
      await supabase.from('property_documents').insert({
        property_id: property.data.id,
        source: 'google_drive',
        drive_file_id: extractDriveFileId(url),
        url,
        original_filename: `${seed.name}.pdf`,
        mime_type: 'application/pdf',
        created_by: profile!.id
      });
    }

    await supabase.from('audit_logs').insert({
      actor_id: profile!.id,
      action: 'google_sheet.import',
      entity_type: 'property',
      entity_id: property.data.id,
      after_data: property.data
    });

    results.push({ rowId: seed.source_google_sheet_row_id, action: 'created', propertyId: property.data.id });
  }

  return NextResponse.json({ data: results });
}
