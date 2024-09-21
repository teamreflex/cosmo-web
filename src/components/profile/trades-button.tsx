import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import Link from "next/link";

export default function TradesButton({ nickname }: { nickname: string }) {
  return (
    <Button variant="secondary" size="profile" asChild>
      <Link href={`/@${nickname}/trades`}>
        <Send className="h-5 w-5" />
        <span>Trades</span>
      </Link>
    </Button>
  );
}
