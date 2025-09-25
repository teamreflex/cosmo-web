import { CalendarRange } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { PublicCosmo } from "@/lib/universal/cosmo-accounts";
import { Button } from "@/components/ui/button";

type Props = {
  cosmo: PublicCosmo;
};

export default function ComoButton({ cosmo }: Props) {
  return (
    <Button variant="secondary" size="profile" data-profile asChild>
      <Link to={`/@${cosmo.isAddress ? cosmo.address : cosmo.username}/como`}>
        <CalendarRange className="h-5 w-5" />
        <span>COMO</span>
      </Link>
    </Button>
  );
}
