import { m } from "@/i18n/messages";
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

export function getAdminItems() {
  return [
    {
      title: m.admin_home(),
      url: "/admin",
      icon: IconHome,
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
      title: m.admin_collections_title(),
      url: "/admin/collections",
      icon: IconCards,
    },
    {
      title: m.admin_events_title(),
      url: "/admin/events",
      icon: IconCalendarEvent,
    },
    {
      title: m.admin_cache_title(),
      url: "/admin/cache",
      icon: IconDatabase,
    },
    {
      title: m.admin_api_keys_title(),
      url: "/admin/api-keys",
      icon: IconKey,
    },
    {
      title: m.admin_notice_title(),
      url: "/admin/notice",
      icon: IconAlertTriangle,
    },
  ];
}
