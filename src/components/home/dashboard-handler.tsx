"use client";

import { CosmoArtist } from "@/lib/server/cosmo";
import { ValidArtist } from "@/lib/server/cosmo/common";
import { useSettingsStore } from "@/store";
import { Newspaper, PackageOpen, UserCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import NewsSelectArtist from "../news/news-artist-select";

type Props = {
  artists: CosmoArtist[];
};

function generateButtons(artist: CosmoArtist) {
  return [
    { name: "News", icon: Newspaper, link: `/news?artist=${artist.name}` },
    { name: "Collection", icon: PackageOpen, link: `/collection` },
    { name: "Account", icon: UserCircle, link: `/my` },
  ];
}

export default function DashboardHandler({ artists }: Props) {
  const artist = useSettingsStore((state) => state.artist);
  const setArtist = useSettingsStore((state) => state.setArtist);
  const [selectedArtist, setSelectedArtist] = useState<CosmoArtist>();

  useEffect(() => {
    const cosmoArtist = artists.find((a) => a.name == artist ?? "artms");
    setSelectedArtist(cosmoArtist);
  }, [artist, artists]);

  return (
    <>
      {selectedArtist ? (
        <div className="flex flex-col items-center w-full gap-6 py-6">
          <ArtistLogo artist={selectedArtist.name as ValidArtist} />
          <div className="flex flex-wrap justify-center gap-2">
            {generateButtons(selectedArtist).map((link) => (
              <Link
                className="flex flex-col gap-2 items-center justify-center rounded-xl hover:bg-accent border border-accent hover:border-muted-foreground transition-colors h-32 w-48"
                href={link.link}
                key={link.name}
              >
                <link.icon className="w-12 h-12" />
                <p className="text-xl">{link.name}</p>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center w-full gap-6 py-12">
          {artists.map((artist) => (
            <button
              onClick={() => setArtist(artist.name as ValidArtist)}
              key={artist.name}
            >
              <ArtistLogo artist={artist.name as ValidArtist} />
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function ArtistLogo({ artist }: { artist: ValidArtist }) {
  if (artist == "artms") {
    return <Image src={`/artms.png`} alt="ARTMS" height={97} width={650} />;
  }

  if (artist === "tripleS") {
    return (
      <Image src={`/tripleS.png`} alt="tripleS" height={139} width={929} />
    );
  }

  return null;
}
