import { m } from "@/i18n/messages";
import { resolveContacts } from "@/lib/client/contacts";
import type { PublicUser } from "@/lib/universal/auth";
import ContactChip from "./contact-chip";

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
