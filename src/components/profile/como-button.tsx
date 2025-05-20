import { Button } from "@/components/ui/button";
import type { PublicCosmo } from "@/lib/universal/cosmo-accounts";
import { CalendarRange } from "lucide-react";
import Link from "next/link";

type Props = {
  cosmo: PublicCosmo;
};

export default function ComoButton({ cosmo }: Props) {
  return (
    <Button variant="secondary" size="profile" data-profile asChild>
      <Link
        href={`/@${cosmo.isAddress ? cosmo.address : cosmo.username}/como`}
        prefetch={false}
      >
        <CalendarRange className="h-5 w-5" />
        <span>COMO</span>
      </Link>
    </Button>
  );
}
