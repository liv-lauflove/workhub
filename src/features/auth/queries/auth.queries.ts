import 'server-only';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

/**
 * Get the currently authenticated user from Supabase Auth.
 * Wrapped with React.cache() to deduplicate across Server Components
 * within a single request lifecycle (layout + page + nested components).
 */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Get the authenticated user's profile from the `profiles` table.
 * Calls getUser() internally — thanks to React.cache(), the auth check
 * is only executed once even if both getUser() and getUserProfile()
 * are called in the same request.
 */
export const getUserProfile = cache(async () => {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return data;
});
