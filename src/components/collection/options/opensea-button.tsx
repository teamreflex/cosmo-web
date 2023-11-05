import Link from "next/link";
import OpenSeaLogo from "@/assets/opensea.svg";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function OpenSeaButton({ address }: { address: string }) {
  return (
    <Button variant="opensea" size="sm" asChild>
      <Link href={`https://opensea.io/${address}`} target="_blank">
        <Image
          className="mr-2"
          src={OpenSeaLogo.src}
          width={20}
          height={20}
          alt="OpenSea"
          quality={100}
          priority={true}
        />
        OpenSea
      </Link>
    </Button>
  );
}
