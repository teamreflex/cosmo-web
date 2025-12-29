import { Button } from "@/components/ui/button";
import { m } from "@/i18n/messages";
import type { PublicCosmo } from "@/lib/universal/cosmo-accounts";
import { IconSend } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

type Props = {
  cosmo: PublicCosmo;
};

export default function TradesButton({ cosmo }: Props) {
  return (
    <Button variant="secondary" size="profile" data-profile asChild>
      <Link
        to="/@{$username}/trades"
        params={{ username: cosmo.isAddress ? cosmo.address : cosmo.username }}
      >
        <IconSend className="h-5 w-5" />
        <span>{m.trades_title()}</span>
      </Link>
    </Button>
  );
}
