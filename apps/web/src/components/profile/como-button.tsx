import { CalendarRange } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { PublicCosmo } from "@/lib/universal/cosmo-accounts";
import { Button } from "@/components/ui/button";
import { m } from "@/i18n/messages";

type Props = {
  cosmo: PublicCosmo;
};

export default function ComoButton({ cosmo }: Props) {
  return (
    <Button variant="secondary" size="profile" data-profile asChild>
      <Link
        to="/@{$username}/como"
        params={{ username: cosmo.isAddress ? cosmo.address : cosmo.username }}
      >
        <CalendarRange className="h-5 w-5" />
        <span>{m.common_como()}</span>
      </Link>
    </Button>
  );
}
