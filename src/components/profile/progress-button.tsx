import { Link } from "@tanstack/react-router";
import { PieChart } from "lucide-react";
import type { PublicCosmo } from "@/lib/universal/cosmo-accounts";
import { Button } from "@/components/ui/button";

type Props = {
  cosmo: PublicCosmo;
};

export default function ProgressButton({ cosmo }: Props) {
  return (
    <Button variant="secondary" size="profile" data-profile asChild>
      <Link
        to={`/@${cosmo.isAddress ? cosmo.address : cosmo.username}/progress`}
      >
        <PieChart className="h-5 w-5" />
        <span>Progress</span>
      </Link>
    </Button>
  );
}
