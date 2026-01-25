import { m } from "@/i18n/messages";
import {
  IconCalendarEvent,
  IconDisc,
  IconHome,
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
      title: m.admin_events_title(),
      url: "/admin/events",
      icon: IconCalendarEvent,
    },
  ];
}
