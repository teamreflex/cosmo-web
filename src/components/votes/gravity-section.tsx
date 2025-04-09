import { GravityResult } from "@/lib/universal/votes";
import Image from "next/image";
import PollResults from "./poll-results";
import Link from "next/link";

type Props = {
  gravity: GravityResult;
  index: number;
};

export default function GravitySection({ gravity, index }: Props) {
  const href = `/gravity/${gravity.artist}/${gravity.cosmoId}`;
  const priority = index < 4;

  return (
    <div className="flex flex-col rounded-lg overflow-hidden bg-accent w-full md:w-1/2 md:mx-auto">
      {/* header */}
      <Link
        href={href}
        className="relative h-48 w-full bg-gradient-to-b from-cosmo/20 to-cosmo/60 border-b border-border group overflow-hidden"
      >
        <Image
          className="object-cover group-hover:scale-105 transition-transform"
          src={gravity.image}
          alt={gravity.title}
          decoding="async"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          loading={priority ? "eager" : "lazy"}
          priority={priority}
          fill
        />
        <div className="absolute inset-0 backdrop-blur-md flex items-center justify-center px-4">
          <h3 className="text-2xl font-cosmo font-bold text-white text-center text-balance drop-shadow-lg text-shadow-lg group-hover:scale-105 transition-transform">
            {gravity.title}
          </h3>
        </div>
      </Link>

      <PollResults
        artist={gravity.artist}
        pollType={gravity.pollType}
        polls={gravity.polls}
      />
    </div>
  );
}
