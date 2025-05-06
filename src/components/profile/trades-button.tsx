import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import Link from "next/link";

type Props = {
  href?: string;
};

export default function TradesButton({ href }: Props) {
  return (
    <Button variant="secondary" size="profile" data-profile asChild>
      <Link href={`/@${href}/trades`}>
        <Send className="h-5 w-5" />
        <span>Trades</span>
      </Link>
    </Button>
  );
}
