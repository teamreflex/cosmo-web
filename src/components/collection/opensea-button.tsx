import Link from "next/link";
import OpenSeaLogo from "@/assets/opensea.svg";
import Image from "next/image";

export default function OpenSeaButton({ address }: { address: string }) {
  return (
    <Link
      href={`https://opensea.io/${address}`}
      target="_blank"
      className="flex items-center gap-2 bg-[#2081E2] hover:bg-[#1868B7] transition-colors text-white text-sm rounded-md px-2 py-1"
    >
      <Image
        src={OpenSeaLogo.src}
        width={20}
        height={20}
        alt="OpenSea"
        unoptimized
      />
      OpenSea
    </Link>
  );
}
