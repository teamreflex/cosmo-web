import Link from "next/link";
import OpenSeaLogo from "@/assets/opensea.svg";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function OpenSeaButton({ address }: { address: string }) {
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <Button className="rounded-full" variant="opensea" size="icon" asChild>
          <Link href={`https://opensea.io/${address}`} target="_blank">
            <Image
              src={OpenSeaLogo.src}
              width={20}
              height={20}
              alt="OpenSea"
              quality={100}
              priority={true}
            />
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">View on OpenSea</TooltipContent>
    </Tooltip>
  );
}
