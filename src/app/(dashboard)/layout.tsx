import { SidebarProvider } from '@/components/layout/sidebar-context';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { getUser, getUserProfile } from '@/features/auth/queries/auth.queries';
import { AiChatbotWidget } from '@/features/ai/components/ai-chatbot-widget';

/**
 * Protected dashboard layout with responsive sidebar, header, and floating AI assistant.
 * Server component that fetches current user & profile for navigation and AI context.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getUser();
  const profile = await getUserProfile();

  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        {/* Desktop Sidebar (visible on md+) */}
        <div className="hidden md:flex md:shrink-0 transition-all duration-300 ease-in-out">
          <Sidebar user={user} profile={profile} />
        </div>

        {/* Main App Canvas */}
        <div className="flex flex-1 flex-col overflow-hidden min-w-0 transition-all duration-300 ease-in-out">
          <Header user={user} profile={profile} />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
        </div>

        {/* Floating AI Chatbot Assistant (Issue #44) */}
        <AiChatbotWidget user={user} profile={profile} />
      </div>
    </SidebarProvider>
  );
}
