import { m } from "@/i18n/messages";
import type { Permissions } from "@apollo/auth";
import {
  IconAlertTriangle,
  IconCalendarEvent,
  IconCards,
  IconDatabase,
  IconDisc,
  IconHome,
  IconKey,
  IconLayoutSidebarRight,
} from "@tabler/icons-react";
import type { Icon } from "@tabler/icons-react";

/**
 * Who can open the admin layout and see its link in the user dropdown.
 */
export const ADMIN_SHELL_PERMISSIONS = {
  site: ["manage"],
} satisfies Permissions;

type AdminItem = {
  title: string;
  url: string;
  icon: Icon;
  permissions: Permissions;
};

export function getAdminItems(): AdminItem[] {
  return [
    {
      title: m.admin_home(),
      url: "/admin",
      icon: IconHome,
      permissions: { site: ["manage"] },
    },
    {
      title: m.admin_bands_title(),
      url: "/admin/bands",
      icon: IconLayoutSidebarRight,
      permissions: { site: ["manage"] },
    },
    {
      title: m.admin_eras_title(),
      url: "/admin/eras",
      icon: IconDisc,
      permissions: { site: ["manage"] },
    },
    {
      title: m.admin_collections_title(),
      url: "/admin/collections",
      icon: IconCards,
      permissions: { site: ["manage"] },
    },
    {
      title: m.admin_events_title(),
      url: "/admin/events",
      icon: IconCalendarEvent,
      permissions: { site: ["manage"] },
    },
    {
      title: m.admin_cache_title(),
      url: "/admin/cache",
      icon: IconDatabase,
      permissions: { site: ["manage"] },
    },
    {
      title: m.admin_api_keys_title(),
      url: "/admin/api-keys",
      icon: IconKey,
      permissions: { site: ["manage"] },
    },
    {
      title: m.admin_notice_title(),
      url: "/admin/notice",
      icon: IconAlertTriangle,
      permissions: { site: ["manage"] },
    },
  ];
}
