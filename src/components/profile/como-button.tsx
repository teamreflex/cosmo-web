import { Button } from "@/components/ui/button";
import { CalendarRange } from "lucide-react";
import Link from "next/link";

export default function ComoButton({ nickname }: { nickname: string }) {
  return (
    <Button variant="secondary" size="profile" data-profile asChild>
      <Link href={`/@${nickname}/como`}>
        <CalendarRange className="h-5 w-5" />
        <span>COMO</span>
      </Link>
    </Button>
  );
}
