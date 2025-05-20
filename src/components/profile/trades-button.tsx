import { Button } from "@/components/ui/button";
import type { PublicCosmo } from "@/lib/universal/cosmo-accounts";
import { Send } from "lucide-react";
import Link from "next/link";

type Props = {
  cosmo: PublicCosmo;
};

export default function TradesButton({ cosmo }: Props) {
  return (
    <Button variant="secondary" size="profile" data-profile asChild>
      <Link
        href={`/@${cosmo.isAddress ? cosmo.address : cosmo.username}/trades`}
        prefetch={false}
      >
        <Send className="h-5 w-5" />
        <span>Trades</span>
      </Link>
    </Button>
  );
}
