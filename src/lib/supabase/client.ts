import { createBrowserClient } from '@supabase/ssr';

import type { Database } from '@/lib/database.types';
import { env } from '@/lib/env';

export function createSupabaseBrowserClient() {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error('Supabase browser credentials are not configured.');
  }

  return createBrowserClient<Database>(env.supabaseUrl, env.supabaseAnonKey);
}
