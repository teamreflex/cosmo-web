import { Link } from "@tanstack/react-router";
import { Send } from "lucide-react";
import type { PublicCosmo } from "@/lib/universal/cosmo-accounts";
import { Button } from "@/components/ui/button";

type Props = {
  cosmo: PublicCosmo;
};

export default function TradesButton({ cosmo }: Props) {
  return (
    <Button variant="secondary" size="profile" data-profile asChild>
      <Link
        to="/@$username/trades"
        params={{ username: cosmo.isAddress ? cosmo.address : cosmo.username }}
      >
        <Send className="h-5 w-5" />
        <span>Trades</span>
      </Link>
    </Button>
  );
}
