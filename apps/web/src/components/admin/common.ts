import { m } from "@/i18n/messages";
import { COSMO_TRANSFER_PERMISSIONS } from "@/lib/universal/cosmo-transfer";
import { can } from "@apollo/auth";
import type { Permissions, Role } from "@apollo/auth";
import {
  IconAlertTriangle,
  IconCalendarEvent,
  IconCards,
  IconDatabase,
  IconDisc,
  IconFlag,
  IconHistory,
  IconHome,
  IconKey,
  IconLayoutSidebarRight,
  IconUserCog,
} from "@tabler/icons-react";
import type { Icon } from "@tabler/icons-react";
import { notFound } from "@tanstack/react-router";

/**
 * Who can open the admin layout and see its link in the user dropdown: every
 * staff role, since moderators work the report queue.
 */
export const ADMIN_SHELL_PERMISSIONS = {
  report: ["read"],
} satisfies Permissions;

/**
 * Called from an admin page's `beforeLoad`, so its loader never runs for a
 * role without the page's permission. The page's `notFoundComponent`
 * (`AdminNoAccess`) then fills the admin shell. It is a not-found rather than
 * an error because SSR answers route errors with a 500.
 */
export function requireStaffPage(role: Role, permissions: Permissions) {
  if (!can(role, permissions)) {
    throw notFound();
  }
}

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
      title: m.admin_reports_title(),
      url: "/admin/reports",
      icon: IconFlag,
      permissions: { report: ["read"] },
    },
    {
      title: m.admin_audit_nav(),
      url: "/admin/audit",
      icon: IconHistory,
      permissions: { audit: ["read"] },
    },
    {
      title: m.admin_accounts_title(),
      url: "/admin/accounts",
      icon: IconUserCog,
      permissions: COSMO_TRANSFER_PERMISSIONS,
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
