import type { UserRole } from '@/lib/database.types';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function getCurrentProfile() {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const { data: userResult } = await supabase.auth.getUser();
  if (!userResult.user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userResult.user.id)
    .single();

  return data;
}

export function canEdit(role?: UserRole | null) {
  return role === 'admin' || role === 'editor';
}

export function canAdmin(role?: UserRole | null) {
  return role === 'admin';
}
