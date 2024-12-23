import { HardDriveUpload, Home } from "lucide-react";

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
import { env } from "@/env.mjs";

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
];

export function AdminSidebar() {
  return (
    <Sidebar className="mt-14">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {env.NEXT_PUBLIC_APP_NAME} Admin
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
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
