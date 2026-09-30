import { CONTACT_ICONS, type Contact } from "@/lib/client/contacts";
import { cn } from "@/lib/utils";

/**
 * One way to reach a user: platform icon, label and handle, linked when the
 * platform has profile URLs.
 */
export default function ContactChip({ contact }: { contact: Contact }) {
  const className = cn(
    "inline-flex h-8 items-center gap-2 rounded-sm border border-border bg-card px-2.5 font-mono text-xs whitespace-nowrap",
    contact.href && "transition-colors hover:bg-accent",
  );
  const content = (
    <>
      <span className="text-cosmo">{CONTACT_ICONS[contact.kind]}</span>
      <span className="text-xxs tracking-widest text-muted-foreground uppercase">
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
