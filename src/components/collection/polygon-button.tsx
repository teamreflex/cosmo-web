import Link from "next/link";
import PolygonLogo from "@/assets/polygon.svg";
import Image from "next/image";

export default function PolygonButton({ address }: { address: string }) {
  return (
    <Link
      href={`https://polygonscan.com/address/${address}`}
      target="_blank"
      className="flex items-center gap-2 bg-[#8247E5] hover:bg-[#9630ce] transition-colors text-white text-sm rounded-md px-2 py-1"
    >
      <Image
        src={PolygonLogo.src}
        width={20}
        height={20}
        alt="PolygonScan"
        unoptimized
      />
      PolygonScan
    </Link>
  );
}
