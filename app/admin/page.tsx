import { redirect } from 'next/navigation';
import EjsPage from '@/components/ejs-page';
import { currentNextUser } from '@/lib/next-auth';
export const dynamic = 'force-dynamic';
export default async function Page() {
  const user = await currentNextUser();
  if (!user || user.role !== 'admin') redirect('/admin/login');
  return <EjsPage pathname="/admin" user={user} />;
}
