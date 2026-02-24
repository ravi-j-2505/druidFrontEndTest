
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-grow">
          <div className="p-4">
            <SidebarTrigger />
          </div>
          <main className="pb-12">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
