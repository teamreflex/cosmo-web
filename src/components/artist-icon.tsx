import { ValidArtist } from "@/lib/universal/cosmo";
import { Moon, Sparkle } from "lucide-react";
import { ReactNode } from "react";

const map: Record<ValidArtist, ReactNode> = {
  artms: (
    <Moon className="ring-1 p-px w-4 h-4 rounded-full text-teal-400 fill-teal-400 ring-teal-400" />
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
