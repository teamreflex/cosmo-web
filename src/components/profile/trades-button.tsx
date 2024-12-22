import { Button } from "@/components/ui/button";
import { LuSend } from "react-icons/lu";
import Link from "next/link";

export default function TradesButton({ nickname }: { nickname: string }) {
  return (
    <Button variant="secondary" size="profile" data-profile asChild>
      <Link href={`/@${nickname}/trades`}>
        <LuSend className="h-5 w-5" />
        <span>Trades</span>
      </Link>
    </Button>
  );
}
