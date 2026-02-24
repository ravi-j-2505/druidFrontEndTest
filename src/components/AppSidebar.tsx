import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/context/AuthContext";
import { Link, useLocation } from "react-router-dom";
import {
  Book,
  FileText,
  Home,
  ImageIcon,
  Layers,
  LogOut,
  Search,
  Settings,
  Tag,
  UserCircle,
} from "lucide-react";

export function AppSidebar() {
  const { logout, user } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <Sidebar>
      <SidebarHeader className="py-6">
        <div className="flex flex-col items-center justify-center">
          <div className="flex items-center gap-2">
            <Book className="h-8 w-8 text-forest-400" />
            <h1 className="text-2xl font-bold logo-text">Druid</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Learning Insights
          </p>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className={isActive("/") ? "bg-sidebar-accent" : ""}
                >
                  <Link to="/">
                    <Home />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem> */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className={isActive("/documents") ? "bg-sidebar-accent" : ""}
                >
                  <Link to="/documents">
                    <FileText />
                    <span>Documents</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {/* <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className={isActive("/metadata") ? "bg-sidebar-accent" : ""}
                >
                  <Link to="/metadata">
                    <Layers />
                    <span>Metadata</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem> */}
              {/* <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className={isActive("/labeling") ? "bg-sidebar-accent" : ""}
                >
                  <Link to="/labeling">
                    <Tag />
                    <span>Labeling</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem> */}
              {/* <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className={
                    isActive("/summarization") ? "bg-sidebar-accent" : ""
                  }
                >
                  <Link to="/summarization">
                    <Search />
                    <span>Summarization</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem> */}
              {/* <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className={isActive("/media") ? "bg-sidebar-accent" : ""}
                >
                  <Link to="/media">
                    <ImageIcon />
                    <span>Media</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem> */}
              {/* <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className={
                    isActive("/gap-analysis") ? "bg-sidebar-accent" : ""
                  }
                >
                  <Link to="/gap-analysis">
                    <Book />
                    <span>Gap Analysis</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem> */}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Account</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className={isActive("/profile") ? "bg-sidebar-accent" : ""}
                >
                  <Link to="/profile">
                    <UserCircle />
                    <span>Profile</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className={isActive("/settings") ? "bg-sidebar-accent" : ""}
                >
                  <Link to="/settings">
                    <Settings />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem> */}
              <SidebarMenuItem>
                <SidebarMenuButton onClick={logout}>
                  <LogOut />
                  <span>Logout</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="p-4 text-xs text-muted-foreground">
          {user?.username ? `Logged in as ${user.username}` : "Not logged in"}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
