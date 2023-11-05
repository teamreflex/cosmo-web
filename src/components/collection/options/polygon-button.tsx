import Link from "next/link";
import PolygonLogo from "@/assets/polygon.svg";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function PolygonButton({ address }: { address: string }) {
  return (
    <Button variant="polygon" size="sm" asChild>
      <Link href={`https://polygonscan.com/address/${address}`} target="_blank">
        <Image
          className="mr-2"
          src={PolygonLogo.src}
          width={20}
          height={20}
          alt="PolygonScan"
          quality={100}
          priority={true}
        />
        PolygonScan
      </Link>
    </Button>
  );
}
