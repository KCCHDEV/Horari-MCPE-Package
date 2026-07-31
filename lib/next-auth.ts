import { cookies } from 'next/headers';
import { getCurrentUser } from './auth';

export async function currentNextUser() {
  const store = await cookies();
  const cookie = store.toString();
  return getCurrentUser(new Request('http://next.local/', { headers: { cookie } }));
}
