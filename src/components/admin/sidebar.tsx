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

export const items = [
  {
    title: "Home",
    url: "/admin",
    icon: Home,
  },
  {
    title: "Objekt Metadata",
    url: "/admin/metadata",
    icon: HardDriveUpload,
  },
  {
    title: "Objekt Bands",
    url: "/admin/bands",
    icon: PanelRight,
  },
];

export function AdminSidebar() {
  const location = useLocation();

  return (
    <Sidebar className="mt-14">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{env.VITE_APP_NAME} Admin</SidebarGroupLabel>
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
