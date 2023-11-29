import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Copy, Link2, Share2 } from "lucide-react";
import Link from "next/link";
import PolygonLogo from "@/assets/polygon.svg";
import OpenSeaLogo from "@/assets/opensea.svg";
import Image from "next/image";
import { useCopyToClipboard } from "usehooks-ts";
import { toast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";

export default function MobileOptions({ address }: { address: string }) {
  const [_, copy] = useCopyToClipboard();

  function copyAddress() {
    copy(address);
    toast({
      description: "Wallet address copied to clipboard",
    });
  }

  function copyLink() {
    copy(window.location.href);
    toast({
      description: "Profile link copied to clipboard",
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {/* copy profile */}
        <DropdownMenuItem>
          <Link2 className="mr-2 h-5 w-5" />
          <span onClick={copyLink}>Copy Profile</span>
        </DropdownMenuItem>

        {/* copy address */}
        <DropdownMenuItem>
          <Copy className="mr-2 h-5 w-5" />
          <span onClick={copyAddress}>Copy Address</span>
        </DropdownMenuItem>

        {/* polygonscan */}
        <DropdownMenuItem>
          <div className="relative mr-2 h-5 w-5">
            <Image
              src={PolygonLogo.src}
              fill={true}
              alt="PolygonScan"
              unoptimized
            />
          </div>

          <Link
            href={`https://polygonscan.com/address/${address}`}
            target="_blank"
          >
            PolygonScan
          </Link>
        </DropdownMenuItem>

        {/* opensea */}
        <DropdownMenuItem>
          <div className="relative mr-2 h-5 w-5">
            <Image
              src={OpenSeaLogo.src}
              fill={true}
              alt="OpenSea"
              unoptimized
            />
          </div>

          <Link href={`https://opensea.io/${address}`} target="_blank">
            OpenSea
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
