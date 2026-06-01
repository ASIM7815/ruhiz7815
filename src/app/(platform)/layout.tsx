import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Topbar } from "@/components/layout/topbar";

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Topbar />
        <main className="platform-main flex-1 overflow-y-auto overflow-x-hidden p-4 pb-[calc(var(--mobile-nav-height)+1rem)] sm:p-4 sm:pb-[calc(var(--mobile-nav-height)+1rem)] lg:p-6 lg:pb-6">
          {children}
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
