import 'server-only';
import { redirect } from 'next/navigation';
import { getUser } from '../queries/auth.queries';
import { ROUTES } from '@/config/routes';

export async function requireAuth() {
  const user = await getUser();
  if (!user) redirect(ROUTES.login);
  return user;
}
