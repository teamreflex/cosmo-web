import type { PublicUser } from "@/lib/universal/auth";
import { IconBrandDiscord, IconBrandTwitter } from "@tabler/icons-react";
import type { ReactNode } from "react";

export type Contact = {
  kind: "discord" | "twitter";
  label: string;
  handle: string;
  href?: string;
};

export function resolveContacts(user: PublicUser | undefined): Contact[] {
  if (!user || !user.showSocials) return [];

  const contacts: Contact[] = [];
  if (user.social.discord) {
    contacts.push({
      kind: "discord",
      label: "Discord",
      handle: user.social.discord,
    });
  }
  if (user.social.twitter) {
    const handle = user.social.twitter.replace(/^@/, "");
    contacts.push({
      kind: "twitter",
      label: "Twitter",
      handle: `@${handle}`,
      href: `https://x.com/${encodeURIComponent(handle)}`,
    });
  }
  return contacts;
}

export const CONTACT_ICONS = {
  discord: <IconBrandDiscord className="size-3.5" />,
  twitter: <IconBrandTwitter className="size-3.5" />,
} satisfies Record<Contact["kind"], ReactNode>;
