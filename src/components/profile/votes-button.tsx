import { Button } from "@/components/ui/button";
import { Vote } from "lucide-react";
import Link from "next/link";

export default function VotesButton({ nickname }: { nickname: string }) {
  return (
    <Button variant="secondary" size="profile" data-profile asChild>
      <Link href={`/@${nickname}/voting`}>
        <Vote className="h-5 w-5" />
        <span>Votes</span>
      </Link>
    </Button>
  );
}
