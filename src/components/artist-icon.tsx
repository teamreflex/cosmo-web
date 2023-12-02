import { ValidArtist } from "@/lib/universal/cosmo/common";
import { Sparkle } from "lucide-react";
import { ReactNode } from "react";

const map: Record<ValidArtist, ReactNode> = {
  artms: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="ring-1 p-px w-4 h-4 rounded-full text-teal-400 fill-teal-400 ring-teal-400 saturate-[.60]"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
      />
    </svg>
  ),
  tripleS: (
    <Sparkle className="ring-1 p-px w-4 h-4 rounded-full text-purple-300 fill-purple-300 ring-purple-300" />
  ),
};

export default function ArtistIcon({
  artist,
}: {
  artist: ValidArtist | string;
}) {
  return map[artist as ValidArtist] ?? null;
}
