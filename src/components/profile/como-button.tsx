import { Button } from "@/components/ui/button";
import { CalendarRange } from "lucide-react";
import Link from "next/link";

type Props = {
  href?: string;
};

export default function ComoButton({ href }: Props) {
  return (
    <Button variant="secondary" size="profile" data-profile asChild>
      <Link href={`/@${href}/como`}>
        <CalendarRange className="h-5 w-5" />
        <span>COMO</span>
      </Link>
    </Button>
  );
}
