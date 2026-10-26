import { memoryAdapter } from "better-auth/adapters/memory";
import { betterAuth } from "better-auth/minimal";
import { admin } from "better-auth/plugins/admin";
import { describe, expect, test } from "bun:test";
import {
  adminPluginOptions,
  can,
  parseRole,
  type Permissions,
  type Role,
  roleNames,
  roles,
  statement,
} from "../src/index";

/**
 * A throwaway instance running the admin plugin with production's options.
 * Permission checks by role read no session, so the adapter stays empty.
 */
const auth = betterAuth({
  telemetry: { enabled: false },
  secret: crypto.randomUUID() + crypto.randomUUID(),
  baseURL: "http://localhost:3000",
  database: memoryAdapter({}),
  plugins: [admin(adminPluginOptions)],
});

/**
 * One resource and action per row, written by hand rather than derived from
 * `roles`, so a change to a role's grants has to change this table too.
 */
const rows = [
  {
    permissions: { market: ["access"] },
    expected: { user: false, tester: true, moderator: true, admin: true },
  },
  {
    permissions: { trade: ["read-any"] },
    expected: { user: false, tester: false, moderator: true, admin: true },
  },
  {
    permissions: { trade: ["cancel-any"] },
    expected: { user: false, tester: false, moderator: true, admin: true },
  },
  {
    permissions: { trade: ["resolve-dispute"] },
    expected: { user: false, tester: false, moderator: true, admin: true },
  },
  {
    permissions: { trade: ["remove-message"] },
    expected: { user: false, tester: false, moderator: true, admin: true },
  },
  {
    permissions: { trade: ["message"] },
    expected: { user: false, tester: false, moderator: true, admin: true },
  },
  {
    permissions: { listing: ["remove-any"] },
    expected: { user: false, tester: false, moderator: true, admin: true },
  },
  {
    permissions: { feedback: ["remove-any"] },
    expected: { user: false, tester: false, moderator: true, admin: true },
  },
  {
    permissions: { report: ["read"] },
    expected: { user: false, tester: false, moderator: true, admin: true },
  },
  {
    permissions: { report: ["resolve"] },
    expected: { user: false, tester: false, moderator: true, admin: true },
  },
  {
    permissions: { report: ["escalate"] },
    expected: { user: false, tester: false, moderator: true, admin: true },
  },
  {
    permissions: { user: ["ban"] },
    expected: { user: false, tester: false, moderator: false, admin: true },
  },
  {
    permissions: { user: ["set-role"] },
    expected: { user: false, tester: false, moderator: false, admin: true },
  },
  {
    permissions: { site: ["manage"] },
    expected: { user: false, tester: false, moderator: false, admin: true },
  },
  {
    permissions: { audit: ["read"] },
    expected: { user: false, tester: false, moderator: false, admin: true },
  },
  {
    permissions: { cosmo: ["history"] },
    expected: { user: false, tester: false, moderator: false, admin: true },
  },
] satisfies readonly {
  permissions: Permissions;
  expected: Record<Role, boolean>;
}[];

/**
 * Lists `resource:action` pairs. The rows' union type marks the resources a
 * row leaves out as optional, hence the `undefined`.
 */
function flatten(permissions: {
  readonly [resource: string]: readonly string[] | undefined;
}) {
  return Object.entries(permissions).flatMap(([resource, actions = []]) =>
    actions.map((action) => `${resource}:${action}`),
  );
}

describe("role matrix", () => {
  test.each(rows)("$permissions", async ({ permissions, expected }) => {
    for (const role of roleNames) {
      const result = await auth.api.userHasPermission({
        body: { role, permissions },
      });

      expect(can(role, permissions)).toBe(expected[role]);
      expect(result.success).toBe(expected[role]);
    }
  });

  test("no role can impersonate", async () => {
    for (const role of roleNames) {
      const result = await auth.api.userHasPermission({
        // @ts-expect-error - impersonate is not in the statement
        body: { role, permissions: { user: ["impersonate"] } },
      });

      // @ts-expect-error - impersonate is not in the statement
      expect(can(role, { user: ["impersonate"] })).toBe(false);
      expect(result.success).toBe(false);
    }
  });

  test("covers every action in the statement exactly once", () => {
    const covered = rows.flatMap((row) => flatten(row.permissions));

    expect(covered).toHaveLength(rows.length);
    expect(covered.toSorted()).toEqual(flatten(statement).toSorted());
  });

  test("has no chat resource: staff read and moderate chats through trade", () => {
    expect(Object.keys(statement)).not.toContain("chat");
    expect(statement.trade).toContain("remove-message");
  });

  test("rejects actions and resources outside the statement", () => {
    // @ts-expect-error - "mange" is not a site action
    expect(can("admin", { site: ["mange"] })).toBe(false);
    // @ts-expect-error - session is not a resource
    expect(can("admin", { session: ["revoke"] })).toBe(false);
  });
});

describe("parseRole", () => {
  test.each([null, "", "owner", "admin,moderator"])(
    "falls back to user for %p",
    (value) => {
      expect(parseRole(value)).toBe("user");
    },
  );

  test("keeps a known role", () => {
    expect(parseRole("moderator")).toBe("moderator");
  });
});

test("roleNames lists every role", () => {
  expect(Object.keys(roles).toSorted()).toEqual(roleNames.toSorted());
});
