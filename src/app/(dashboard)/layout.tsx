import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { getUser, getUserProfile } from '@/features/auth/queries/auth.queries';

/**
 * Protected dashboard layout with responsive sidebar and header.
 * Server component that fetches current user & profile for navigation.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  const profile = await getUserProfile();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar (visible on md+) */}
      <div className="hidden md:flex md:shrink-0">
        <Sidebar user={user} profile={profile} />
      </div>

      {/* Main App Canvas */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header user={user} profile={profile} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
