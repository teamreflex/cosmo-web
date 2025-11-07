import { Sparkle } from "lucide-react";
import type { ValidArtist } from "@apollo/cosmo/types/common";
import type { ReactNode } from "react";

const map: Record<ValidArtist, ReactNode> = {
  artms: (
    <div className="rounded-full p-px ring-1 ring-teal-400 saturate-[.60]">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-[14px] w-[14px] fill-teal-400 text-teal-400"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
        />
      </svg>
    </div>
  ),
  tripleS: (
    <Sparkle className="h-4 w-4 rounded-full fill-purple-300 p-px text-purple-300 ring-1 ring-purple-300" />
  ),
  idntt: (
    <div className="rounded-full p-px ring-1 ring-[#3b82f6]">
      <svg
        className="h-[14px] w-[14px] fill-[#3b82f6] text-[#3b82f6]"
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="50" cy="25" r="10" />
        <rect
          x="30"
          y="50"
          width="30"
          height="30"
          transform="rotate(45 50 70)"
        />
      </svg>
    </div>
  ),
};

export default function ArtistIcon({
  artist,
}: {
  artist: ValidArtist | string;
}) {
  return map[artist as ValidArtist] ?? null;
}
