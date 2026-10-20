import { m } from "@/i18n/messages";
import type { Permissions } from "@apollo/auth";
import {
  IconAlertTriangle,
  IconCalendarEvent,
  IconCards,
  IconDatabase,
  IconDisc,
  IconFlag,
  IconHash,
  IconHistory,
  IconHome,
  IconKey,
  IconLayoutSidebarRight,
  IconUserCog,
} from "@tabler/icons-react";
import type { Icon } from "@tabler/icons-react";

/**
 * Who can open the admin layout and see its link in the user dropdown: every
 * staff role, since moderators work the report queue.
 */
export const ADMIN_SHELL_PERMISSIONS = {
  report: ["read"],
} satisfies Permissions;

/**
 * Who can open /admin/accounts. The role card and the link history each
 * render only for their own action, so either one opens the page.
 */
export const ADMIN_ACCOUNTS_PERMISSIONS = [
  { user: ["set-role"] },
  { cosmo: ["history"] },
] satisfies Permissions[];

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
      title: m.admin_serials_title(),
      url: "/admin/serials",
      icon: IconHash,
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
