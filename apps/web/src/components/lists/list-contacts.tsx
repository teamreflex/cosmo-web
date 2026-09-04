import { m } from "@/i18n/messages";
import {
  CONTACT_ICONS,
  resolveContacts,
  type Contact,
} from "@/lib/client/contacts";
import type { PublicUser } from "@/lib/universal/auth";
import { cn } from "@/lib/utils";

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

function ContactChip({ contact }: { contact: Contact }) {
  const className = cn(
    "inline-flex h-8 items-center gap-2 rounded-sm border border-border bg-card px-2.5 font-mono text-xs",
    contact.href && "transition-colors hover:bg-accent",
  );
  const content = (
    <>
      <span className="text-cosmo">{CONTACT_ICONS[contact.kind]}</span>
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
