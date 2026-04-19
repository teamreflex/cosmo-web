import { m } from "@/i18n/messages";
import type { PublicUser } from "@/lib/universal/auth";
import { cn } from "@/lib/utils";
import { IconBrandDiscord, IconBrandTwitter } from "@tabler/icons-react";
import type { ReactNode } from "react";

type Contact = {
  kind: "discord" | "twitter";
  label: string;
  handle: string;
  href?: string;
};

type Props = {
  ownerName: string;
  user: PublicUser | undefined;
};

export default function ListContacts({ ownerName, user }: Props) {
  const contacts = resolveContacts(user);
  if (contacts.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 font-mono text-xxs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
        <span>{m.list_header_contacts_heading({ user: ownerName })}</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {contacts.map((contact) => (
          <ContactChip key={contact.kind} contact={contact} />
        ))}
      </div>
    </div>
  );
}

function resolveContacts(user: PublicUser | undefined): Contact[] {
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

const ICONS: Record<Contact["kind"], ReactNode> = {
  discord: <IconBrandDiscord className="size-3.5" />,
  twitter: <IconBrandTwitter className="size-3.5" />,
};

function ContactChip({ contact }: { contact: Contact }) {
  const className = cn(
    "inline-flex h-8 items-center gap-2 rounded-sm border border-border bg-card px-2.5 font-mono text-xs",
    contact.href && "transition-colors hover:bg-accent",
  );
  const content = (
    <>
      <span className="text-cosmo">{ICONS[contact.kind]}</span>
      <span className="text-xxs tracking-[0.14em] text-muted-foreground uppercase">
        {contact.label}
      </span>
      <span className="tabular-nums">{contact.handle}</span>
    </>
  );

  if (contact.href) {
    return (
      <a
        href={contact.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {content}
      </a>
    );
  }

  return <span className={className}>{content}</span>;
}
