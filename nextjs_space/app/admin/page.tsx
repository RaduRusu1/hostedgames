import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { AdminDashboardClient } from './_components/admin-dashboard-client';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    redirect('/login');
  }

  return <AdminDashboardClient />;
}
