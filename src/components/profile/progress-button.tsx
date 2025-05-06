import { Button } from "@/components/ui/button";
import { PieChart } from "lucide-react";
import Link from "next/link";

type Props = {
  href?: string;
};

export default function ProgressButton({ href }: Props) {
  return (
    <Button variant="secondary" size="profile" data-profile asChild>
      <Link href={`/@${href}/progress`}>
        <PieChart className="h-5 w-5" />
        <span>Progress</span>
      </Link>
    </Button>
  );
}
