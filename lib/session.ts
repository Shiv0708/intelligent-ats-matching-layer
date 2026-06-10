import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function getSession() {
  return getServerSession(authOptions);
}

export async function getCurrentUserId(): Promise<string | undefined> {
  const session = await getSession();
  return session?.user?.id;
}
