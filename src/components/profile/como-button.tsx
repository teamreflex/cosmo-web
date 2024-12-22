import { Button } from "@/components/ui/button";
import { LuCalendarRange } from "react-icons/lu";
import Link from "next/link";

export default function ComoButton({ nickname }: { nickname: string }) {
  return (
    <Button variant="secondary" size="profile" data-profile asChild>
      <Link href={`/@${nickname}/como`}>
        <LuCalendarRange className="h-5 w-5" />
        <span>COMO</span>
      </Link>
    </Button>
  );
}
