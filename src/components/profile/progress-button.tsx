import { Button } from "@/components/ui/button";
import Link from "next/link";
import { TbChartPie } from "react-icons/tb";

export default function ProgressButton({ nickname }: { nickname: string }) {
  return (
    <Button variant="secondary" size="profile" data-profile asChild>
      <Link href={`/@${nickname}/progress`}>
        <TbChartPie className="h-5 w-5" />
        <span>Progress</span>
      </Link>
    </Button>
  );
}
