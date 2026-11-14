import type { Permissions } from "@apollo/auth";

/**
 * Who can open the admin layout and see its link in the user dropdown: every
 * staff role, since moderators work the report queue. The navbar and the
 * route guards read these on every page, so they sit apart from the admin
 * nav list, which loads with the admin pages.
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
