import { m } from "@/i18n/messages";
import { cn } from "@/lib/utils";
import {
  IconBrandDiscord,
  IconBrandTelegram,
  IconBrandTwitter,
  IconMail,
} from "@tabler/icons-react";
import type { ReactNode } from "react";

type Contact = {
  kind: "discord" | "twitter" | "telegram" | "email";
  label: string;
  handle: string;
};

const PLACEHOLDER_CONTACTS: Contact[] = [
  { kind: "discord", label: "Discord", handle: "username#0000" },
  { kind: "twitter", label: "Twitter", handle: "@username" },
  { kind: "telegram", label: "Telegram", handle: "@username" },
  { kind: "email", label: "Email", handle: "user@example.com" },
];

type Props = {
  ownerName: string;
};

export default function ListContacts({ ownerName }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 font-mono text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
        <span>{m.list_header_contacts_heading({ user: ownerName })}</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="flex flex-wrap gap-1.5" aria-disabled="true">
        {PLACEHOLDER_CONTACTS.map((contact) => (
          <ContactChip key={contact.kind} contact={contact} />
        ))}
      </div>
      <div
        className="font-mono text-[10px] leading-relaxed text-muted-foreground italic"
        title={m.list_header_contacts_soon()}
      >
        {m.list_header_contacts_soon()}
      </div>
    </div>
  );
}

const ICONS: Record<Contact["kind"], ReactNode> = {
  discord: <IconBrandDiscord className="size-3.5" />,
  twitter: <IconBrandTwitter className="size-3.5" />,
  telegram: <IconBrandTelegram className="size-3.5" />,
  email: <IconMail className="size-3.5" />,
};

function ContactChip({ contact }: { contact: Contact }) {
  return (
    <button
      type="button"
      disabled
      aria-disabled="true"
      className={cn(
        "inline-flex h-8 cursor-not-allowed items-center gap-2 rounded-sm border border-border bg-card px-2.5 font-mono text-xs opacity-60",
      )}
    >
      <span className="text-cosmo">{ICONS[contact.kind]}</span>
      <span className="text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
        {contact.label}
      </span>
      <span className="tabular-nums">{contact.handle}</span>
    </button>
  );
}
