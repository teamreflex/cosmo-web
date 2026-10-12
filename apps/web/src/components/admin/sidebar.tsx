import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useHasPermission } from "@/hooks/use-has-permission";
import { m } from "@/i18n/messages";
import { env } from "@/lib/env/client";
import type { PropsWithClassName } from "@/lib/utils";
import { Link, useLocation } from "@tanstack/react-router";
import { getAdminItems } from "./common";
import ReportsBadge from "./reports/reports-badge";

type Props = PropsWithClassName<{}>;

export function AdminSidebar({ className }: Props) {
  const location = useLocation();
  const hasPermission = useHasPermission();
  const items = getAdminItems().filter((item) =>
    hasPermission(item.permissions),
  );

  return (
    <Sidebar variant="inset" className={className}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {m.admin_title({ appName: env.VITE_APP_NAME })}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    render={<Link to={item.url} />}
                    isActive={location.pathname === item.url}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                  {item.url === "/admin/reports" && <ReportsBadge />}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
