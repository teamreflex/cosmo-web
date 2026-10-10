import { m } from "@/i18n/messages";
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
 * Who can open /admin/accounts. The Move card and the link history each
 * render only for their own action, so either one opens the page.
 */
export const ADMIN_ACCOUNTS_PERMISSIONS = [
  { cosmo: ["transfer"] },
  { cosmo: ["history"] },
] satisfies Permissions[];

/**
 * Called from an admin page's `beforeLoad` with the permissions that open it,
 * any one of which is enough, so its loader never runs for a role without
 * them. The page's `notFoundComponent` (`AdminNoAccess`) then fills the admin
 * shell. It is a not-found rather than an error because SSR answers route
 * errors with a 500.
 */
export function requireStaffPage(role: Role, ...anyOf: Permissions[]) {
  if (!anyOf.some((permissions) => can(role, permissions))) {
    throw notFound();
  }
}

type AdminItem = {
  title: string;
  url: string;
  icon: Icon;
  /** the item shows to a role holding any one of these */
  permissions: Permissions[];
};

export function getAdminItems(): AdminItem[] {
  return [
    {
      title: m.admin_home(),
      url: "/admin",
      icon: IconHome,
      permissions: [{ site: ["manage"] }],
    },
    {
      title: m.admin_reports_title(),
      url: "/admin/reports",
      icon: IconFlag,
      permissions: [{ report: ["read"] }],
    },
    {
      title: m.admin_audit_nav(),
      url: "/admin/audit",
      icon: IconHistory,
      permissions: [{ audit: ["read"] }],
    },
    {
      title: m.admin_accounts_title(),
      url: "/admin/accounts",
      icon: IconUserCog,
      permissions: ADMIN_ACCOUNTS_PERMISSIONS,
    },
    {
      title: m.admin_bands_title(),
      url: "/admin/bands",
      icon: IconLayoutSidebarRight,
      permissions: [{ site: ["manage"] }],
    },
    {
      title: m.admin_eras_title(),
      url: "/admin/eras",
      icon: IconDisc,
      permissions: [{ site: ["manage"] }],
    },
    {
      title: m.admin_collections_title(),
      url: "/admin/collections",
      icon: IconCards,
      permissions: [{ site: ["manage"] }],
    },
    {
      title: m.admin_events_title(),
      url: "/admin/events",
      icon: IconCalendarEvent,
      permissions: [{ site: ["manage"] }],
    },
    {
      title: m.admin_cache_title(),
      url: "/admin/cache",
      icon: IconDatabase,
      permissions: [{ site: ["manage"] }],
    },
    {
      title: m.admin_api_keys_title(),
      url: "/admin/api-keys",
      icon: IconKey,
      permissions: [{ site: ["manage"] }],
    },
    {
      title: m.admin_notice_title(),
      url: "/admin/notice",
      icon: IconAlertTriangle,
      permissions: [{ site: ["manage"] }],
    },
  ];
}
