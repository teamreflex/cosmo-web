import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import Link from "next/link";

export default function TradesButton({ nickname }: { nickname?: string }) {
  return (
    <Button variant="outline" size="sm" asChild>
      <Link href={`/@${nickname}/trades`}>
        <Send />
        <span className="ml-2 hidden sm:block whitespace-nowrap">Trades</span>
      </Link>
    </Button>
  );
}
