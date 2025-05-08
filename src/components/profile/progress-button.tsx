import { Button } from "@/components/ui/button";
import { PieChart } from "lucide-react";
import Link from "next/link";

type Props = {
  username: string;
};

export default function ProgressButton({ username }: Props) {
  return (
    <Button variant="secondary" size="profile" data-profile asChild>
      <Link href={`/@${username}/progress`}>
        <PieChart className="h-5 w-5" />
        <span>Progress</span>
      </Link>
    </Button>
  );
}
