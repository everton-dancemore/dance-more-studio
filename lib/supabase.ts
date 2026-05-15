'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './db-types';

let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

export function supabase() {
  if (!browserClient) {
    browserClient = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return browserClient;
}
