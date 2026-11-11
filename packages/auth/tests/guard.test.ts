import { describe, expect, test } from "bun:test";
import {
  cosmoLinkRefusal,
  hasEmailDomain,
  isBanActive,
  isDemotion,
  parseEmailDomains,
  protectionFor,
  userChangeRefusal,
} from "../src/guard";
import type { CosmoLinkRefusal, UserChange } from "../src/guard";
import { roleNames } from "../src/index";
import type { Role } from "../src/index";

describe("parseEmailDomains", () => {
  test("trims, lowercases and drops empty entries", () => {
    expect([
      ...parseEmailDomains(" Team-Reflex.com ,example.org,, ,EXAMPLE.org"),
    ]).toEqual(["team-reflex.com", "example.org"]);
  });
});

describe("hasEmailDomain", () => {
  const domains = parseEmailDomains("team-reflex.com");

  test.each([
    ["kairu@team-reflex.com", true],
    ["Kairu@TEAM-REFLEX.COM", true],
    ["kairu@sub.team-reflex.com", false],
    ["kairu@team-reflex.com.evil.com", false],
    ["team-reflex.com@evil.com", false],
  ])("%p is %p", (email, expected) => {
    expect(hasEmailDomain(email, domains)).toBe(expected);
  });
});

describe("protectionFor", () => {
  const domains = parseEmailDomains("team-reflex.com");
  const protectedAccount = {
    email: "kairu@team-reflex.com",
    emailVerified: true,
  };
  const member = { email: "member@example.org", emailVerified: true };

  test("tells only a role that can ban, either way", () => {
    expect(protectionFor("admin", protectedAccount, domains)).toBe(true);
    expect(protectionFor("admin", member, domains)).toBe(false);
    expect(protectionFor("moderator", protectedAccount, domains)).toBeNull();
  });
});

describe("isBanActive", () => {
  const now = new Date("2026-10-09T12:00:00Z");

  test.each([
    ["not banned", { banned: false, banExpires: null }, false],
    ["banned with no expiry", { banned: true, banExpires: null }, true],
    [
      "banned until later",
      { banned: true, banExpires: new Date("2026-10-09T12:00:01Z") },
      true,
    ],
    [
      "banned until earlier",
      { banned: true, banExpires: new Date("2026-10-09T11:59:59Z") },
      false,
    ],
    ["banned until now", { banned: true, banExpires: now }, false],
  ])("%s is %p", (_, user, expected) => {
    expect(isBanActive(user, now)).toBe(expected);
  });
});

describe("isDemotion", () => {
  /**
   * Written out by hand so a new role has to take a place in the ranking.
   */
  const demotions = [
    ["tester", "user"],
    ["moderator", "user"],
    ["moderator", "tester"],
    ["admin", "user"],
    ["admin", "tester"],
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

  test("refuses banning yourself", () => {
    expect(
      userChangeRefusal({
        caller: admin,
        target: {
          id: admin.id,
          email: "admin@example.org",
          emailVerified: true,
        },
        change: { kind: "ban" },
        protectedDomains,
      }),
    ).toBe("self-ban");
  });

  test("allows unbanning yourself", () => {
    expect(
      userChangeRefusal({
        caller: admin,
        target: {
          id: admin.id,
          email: "admin@example.org",
          emailVerified: true,
        },
        change: { kind: "unban" },
        protectedDomains,
      }),
    ).toBeNull();
  });

  test("refuses lowering your own role", () => {
    expect(
      userChangeRefusal({
        caller: admin,
        target: {
          id: admin.id,
          email: "admin@example.org",
          emailVerified: true,
        },
        change: { kind: "set-role", role: "moderator" },
        protectedDomains,
      }),
    ).toBe("self-demotion");
  });

  test("allows setting your own role to the same one", () => {
    expect(
      userChangeRefusal({
        caller: { id: "moderator", role: "moderator" },
        target: {
          id: "moderator",
          email: "moderator@example.org",
          emailVerified: true,
        },
        change: { kind: "set-role", role: "moderator" },
        protectedDomains,
      }),
    ).toBeNull();
  });

  test("allows banning an unverified account on a protected domain", () => {
    expect(
      userChangeRefusal({
        caller: admin,
        target: { ...protectedMember, emailVerified: false },
        change: { kind: "ban" },
        protectedDomains,
      }),
    ).toBeNull();
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

describe("cosmoLinkRefusal", () => {
  const now = new Date("2026-10-09T12:00:00Z");
  const owner = {
    id: "owner",
    banned: false,
    banExpires: null,
  };

  test.each([
    ["an unlinked address", null, null],
    ["the caller's own address", null, { ...owner, id: "caller" }],
    ["another user's address", "linked-elsewhere", owner],
    ["a banned owner's address", "banned", { ...owner, banned: true }],
    [
      "an owner whose ban has lapsed",
      "linked-elsewhere",
      {
        ...owner,
        banned: true,
        banExpires: new Date("2026-10-09T11:00:00Z"),
      },
    ],
  ] satisfies [
    string,
    CosmoLinkRefusal | null,
    Parameters<typeof cosmoLinkRefusal>[0]["owner"],
  ][])("%s gives %p", (_, expected, linkedOwner) => {
    expect(
      cosmoLinkRefusal({ callerId: "caller", owner: linkedOwner, now }),
    ).toBe(expected);
  });
});
