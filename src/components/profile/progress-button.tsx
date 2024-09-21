import { Button } from "@/components/ui/button";
import { PieChart } from "lucide-react";
import Link from "next/link";

export default function ProgressButton({ nickname }: { nickname: string }) {
  return (
    <Button variant="secondary" size="profile" asChild>
      <Link href={`/@${nickname}/progress`}>
        <PieChart className="h-5 w-5" />
        <span>Progress</span>
      </Link>
    </Button>
  );
}
