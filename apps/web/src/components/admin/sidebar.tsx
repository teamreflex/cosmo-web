import {
  IconCalendarEvent,
  IconDisc,
  IconHome,
  IconLayoutSidebarRight,
  IconUpload,
} from "@tabler/icons-react";

import { Link, useLocation } from "@tanstack/react-router";
import type { PropsWithClassName } from "@/lib/utils";
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
      icon: IconHome,
    },
    {
      title: m.admin_metadata_title(),
      url: "/admin/metadata",
      icon: IconUpload,
    },
    {
      title: m.admin_bands_title(),
      url: "/admin/bands",
      icon: IconLayoutSidebarRight,
    },
    {
      title: m.admin_eras_title(),
      url: "/admin/eras",
      icon: IconDisc,
    },
    {
      title: m.admin_events_title(),
      url: "/admin/events",
      icon: IconCalendarEvent,
    },
  ];
}

type Props = PropsWithClassName<{}>;

export function AdminSidebar({ className }: Props) {
  const location = useLocation();
  const items = getItems();

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
