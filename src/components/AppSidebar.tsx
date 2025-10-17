import { NavLink, useLocation } from "react-router-dom";
import {
  Home,
  Settings,
  Database,
  Rocket,
  CheckCircle,
  Package,
  TestTube,
  Store,
  FolderKanban,
  Brain,
  BarChart3,
  Shield,
  Cpu,
  Zap,
  FlaskConical,
  Activity,
  Users,
  Layers
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Projects", url: "/projects", icon: FolderKanban },
  { title: "Settings", url: "/settings", icon: Settings },
];

const developmentItems = [
  { title: "Database Manager", url: "/database-manager", icon: Database },
  { title: "Package Manager", url: "/package-manager", icon: Package },
  { title: "Deploy", url: "/deploy", icon: Rocket },
  { title: "Quality Hub", url: "/quality-hub", icon: CheckCircle },
  { title: "Testing Hub", url: "/testing", icon: TestTube },
];

const intelligenceItems = [
  { title: "Intelligence Hub", url: "/intelligence", icon: Brain },
  { title: "AGI Insights", url: "/agi-insights", icon: Cpu },
  { title: "Architecture", url: "/architecture", icon: Layers },
  { title: "Agent Status", url: "/agent-status", icon: Activity },
  { title: "Agent Testing", url: "/agent-test", icon: FlaskConical },
];

const adminItems = [
  { title: "Admin Dashboard", url: "/admin", icon: Shield },
  { title: "Admin Insights", url: "/admin/insights", icon: BarChart3 },
  { title: "AI Dashboard", url: "/admin/ai-dashboard", icon: Brain },
  { title: "Approvals", url: "/admin/approvals", icon: CheckCircle },
  { title: "Platform Analytics", url: "/platform-analytics", icon: BarChart3 },
];

const communityItems = [
  { title: "Explore", url: "/explore", icon: Users },
  { title: "Marketplace", url: "/marketplace", icon: Store },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50";

  return (
    <Sidebar
      className={!open ? "w-14" : "w-60"}
      collapsible="icon"
    >
      <div className="p-4 border-b flex items-center justify-between">
        {open && <h2 className="font-bold text-lg">Navigation</h2>}
        <SidebarTrigger />
      </div>

      <SidebarContent>
        {/* Main */}
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className={!open ? "h-4 w-4" : "mr-2 h-4 w-4"} />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Development */}
        <SidebarGroup>
          <SidebarGroupLabel>Development</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {developmentItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavCls}>
                      <item.icon className={!open ? "h-4 w-4" : "mr-2 h-4 w-4"} />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* AI & Intelligence */}
        <SidebarGroup>
          <SidebarGroupLabel>AI & Intelligence</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {intelligenceItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavCls}>
                      <item.icon className={!open ? "h-4 w-4" : "mr-2 h-4 w-4"} />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin */}
        <SidebarGroup>
          <SidebarGroupLabel>Admin</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavCls}>
                      <item.icon className={!open ? "h-4 w-4" : "mr-2 h-4 w-4"} />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Community */}
        <SidebarGroup>
          <SidebarGroupLabel>Community</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {communityItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className={getNavCls}>
                      <item.icon className={!open ? "h-4 w-4" : "mr-2 h-4 w-4"} />
                      {open && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
