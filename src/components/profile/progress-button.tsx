import { Button } from "@/components/ui/button";
import type { PublicCosmo } from "@/lib/universal/cosmo-accounts";
import { PieChart } from "lucide-react";
import Link from "next/link";

type Props = {
  cosmo: PublicCosmo;
};

export default function ProgressButton({ cosmo }: Props) {
  return (
    <Button variant="secondary" size="profile" data-profile asChild>
      <Link
        href={`/@${cosmo.isAddress ? cosmo.address : cosmo.username}/progress`}
        prefetch={false}
      >
        <PieChart className="h-5 w-5" />
        <span>Progress</span>
      </Link>
    </Button>
  );
}
