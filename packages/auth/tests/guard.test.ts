import { describe, expect, test } from "bun:test";
import {
  hasEmailDomain,
  isDemotion,
  isProtectedAccount,
  parseEmailDomains,
  userChangeRefusal,
} from "../src/guard";
import type { UserChange } from "../src/guard";
import { roleNames } from "../src/index";
import type { Role } from "../src/index";

describe("parseEmailDomains", () => {
  test("trims, lowercases and drops empty entries", () => {
    expect([
      ...parseEmailDomains(" Team-Reflex.com ,example.org,, ,EXAMPLE.org"),
    ]).toEqual(["team-reflex.com", "example.org"]);
  });

  test.each([undefined, "", " , "])("protects nobody for %p", (value) => {
    expect(parseEmailDomains(value).size).toBe(0);
  });
});

describe("hasEmailDomain", () => {
  const domains = parseEmailDomains("team-reflex.com");

  test.each([
    ["kairu@team-reflex.com", true],
    ["Kairu@TEAM-REFLEX.COM", true],
    ["kairu@evil-team-reflex.com", false],
    ["kairu@sub.team-reflex.com", false],
    ["kairu@team-reflex.com.evil.com", false],
    ["team-reflex.com@evil.com", false],
    ['"a@team-reflex.com"@evil.com', false],
  ])("%p is %p", (email, expected) => {
    expect(hasEmailDomain(email, domains)).toBe(expected);
  });

  test("matches a subdomain only when it is listed", () => {
    expect(
      hasEmailDomain(
        "kairu@sub.team-reflex.com",
        parseEmailDomains("team-reflex.com,sub.team-reflex.com"),
      ),
    ).toBe(true);
  });

  test("matches nothing without domains", () => {
    expect(hasEmailDomain("kairu@team-reflex.com", new Set())).toBe(false);
  });
});

describe("isProtectedAccount", () => {
  const domains = parseEmailDomains("team-reflex.com");

  test("protects a verified email on a listed domain", () => {
    expect(
      isProtectedAccount(
        { email: "kairu@team-reflex.com", emailVerified: true },
        domains,
      ),
    ).toBe(true);
  });

  test("ignores an unverified email on a listed domain", () => {
    expect(
      isProtectedAccount(
        { email: "kairu@team-reflex.com", emailVerified: false },
        domains,
      ),
    ).toBe(false);
  });

  test("ignores a verified email elsewhere", () => {
    expect(
      isProtectedAccount(
        { email: "kairu@example.org", emailVerified: true },
        domains,
      ),
    ).toBe(false);
  });
});

describe("isDemotion", () => {
  /**
   * Written out by hand so a new role has to take a place in the ranking.
   */
  const demotions = [
    ["moderator", "user"],
    ["admin", "user"],
    ["admin", "moderator"],
  ] satisfies [Role, Role][];

  test("is true exactly for moves to a lower role", () => {
    for (const from of roleNames) {
      for (const to of roleNames) {
        const expected = demotions.some(
          ([demotedFrom, demotedTo]) =>
            demotedFrom === from && demotedTo === to,
        );
        expect(isDemotion(from, to)).toBe(expected);
      }
    }
  });
});

describe("userChangeRefusal", () => {
  const protectedDomains = parseEmailDomains("team-reflex.com");
  const admin = { id: "admin", role: "admin" } as const;
  const member = {
    id: "member",
    email: "member@example.org",
    emailVerified: true,
  };
  const protectedMember = {
    id: "kairu",
    email: "kairu@team-reflex.com",
    emailVerified: true,
  };

  const changes = [
    { kind: "ban" },
    { kind: "unban" },
    { kind: "set-role", role: "admin" },
    { kind: "set-role", role: "user" },
  ] satisfies UserChange[];

  test.each(changes)("refuses $kind on a protected account", (change) => {
    expect(
      userChangeRefusal({
        caller: admin,
        target: protectedMember,
        change,
        protectedDomains,
      }),
    ).toBe("protected-user");
  });

  test.each(changes)("allows $kind on anyone else", (change) => {
    expect(
      userChangeRefusal({
        caller: admin,
        target: member,
        change,
        protectedDomains,
      }),
    ).toBeNull();
  });

  test("refuses lowering your own role", () => {
    for (const role of ["moderator", "user"] as const) {
      expect(
        userChangeRefusal({
          caller: admin,
          target: {
            id: admin.id,
            email: "admin@example.org",
            emailVerified: true,
          },
          change: { kind: "set-role", role },
          protectedDomains,
        }),
      ).toBe("self-demotion");
    }
  });

  test("allows setting your own role to the same or a higher one", () => {
    for (const role of ["moderator", "admin"] as const) {
      expect(
        userChangeRefusal({
          caller: { id: "moderator", role: "moderator" },
          target: {
            id: "moderator",
            email: "moderator@example.org",
            emailVerified: true,
          },
          change: { kind: "set-role", role },
          protectedDomains,
        }),
      ).toBeNull();
    }
  });

  test("allows lowering someone else's role", () => {
    expect(
      userChangeRefusal({
        caller: admin,
        target: {
          id: "other-admin",
          email: "other@example.org",
          emailVerified: true,
        },
        change: { kind: "set-role", role: "user" },
        protectedDomains,
      }),
    ).toBeNull();
  });

  test("allows any change to an unverified account on a protected domain", () => {
    for (const change of changes) {
      expect(
        userChangeRefusal({
          caller: admin,
          target: { ...protectedMember, emailVerified: false },
          change,
          protectedDomains,
        }),
      ).toBeNull();
    }
  });

  test("protects nobody without domains", () => {
    expect(
      userChangeRefusal({
        caller: admin,
        target: protectedMember,
        change: { kind: "ban" },
        protectedDomains: parseEmailDomains(""),
      }),
    ).toBeNull();
  });
});
