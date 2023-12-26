import Link from "next/link";
import PolygonLogo from "@/assets/polygon.svg";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function PolygonButton({ address }: { address: string }) {
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <Button className="rounded-full" variant="polygon" size="icon" asChild>
          <Link
            href={`https://polygonscan.com/address/${address}`}
            target="_blank"
          >
            <Image
              src={PolygonLogo.src}
              width={20}
              height={20}
              alt="PolygonScan"
              quality={100}
              priority={true}
            />
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">View on PolygonScan</TooltipContent>
    </Tooltip>
  );
}
