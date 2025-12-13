import { Link } from "@tanstack/react-router";
import { IconChartPie } from "@tabler/icons-react";
import type { PublicCosmo } from "@/lib/universal/cosmo-accounts";
import { Button } from "@/components/ui/button";
import { m } from "@/i18n/messages";

type Props = {
  cosmo: PublicCosmo;
};

export default function ProgressButton({ cosmo }: Props) {
  return (
    <Button variant="secondary" size="profile" data-profile asChild>
      <Link
        to="/@{$username}/progress"
        params={{ username: cosmo.isAddress ? cosmo.address : cosmo.username }}
      >
        <IconChartPie className="h-5 w-5" />
        <span>{m.progress_title()}</span>
      </Link>
    </Button>
  );
}
