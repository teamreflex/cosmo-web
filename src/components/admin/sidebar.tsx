import { HardDriveUpload, Home, PanelRight } from "lucide-react";

import { Link, useLocation } from "@tanstack/react-router";
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
import { env } from "@/lib/env/client";
import { m } from "@/i18n/messages";

export function getItems() {
  return [
    {
      title: m.admin_home(),
      url: "/admin",
      icon: Home,
    },
    {
      title: m.admin_metadata_title(),
      url: "/admin/metadata",
      icon: HardDriveUpload,
    },
    {
      title: m.admin_bands_title(),
      url: "/admin/bands",
      icon: PanelRight,
    },
  ];
}

export function AdminSidebar() {
  const location = useLocation();
  const items = getItems();

  return (
    <Sidebar className="mt-14">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{m.admin_title({ appName: env.VITE_APP_NAME })}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url}
                  >
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
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
