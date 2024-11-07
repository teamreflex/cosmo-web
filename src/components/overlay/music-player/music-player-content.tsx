"use client";

import { CosmoAlbum, CosmoAlbumWithTracks } from "@/lib/universal/cosmo/albums";
import { useState } from "react";
import AlbumList from "./states/album-list";
import {
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import VisuallyHidden from "@/components/ui/visually-hidden";
import { Button } from "@/components/ui/button";
import TrackList from "./states/track-list";

type State = "album-list" | "track-list" | "playing";

type Props = {
  albums: CosmoAlbum[];
};

export default function MusicPlayerContent({ albums }: Props) {
  const [state, setState] = useState<State>("album-list");
  const [album, setAlbum] = useState<CosmoAlbumWithTracks>();

  const showHandle = state !== "track-list";

  function onSelectAlbum(album: CosmoAlbumWithTracks) {
    setAlbum(album);
    setState("track-list");
  }

  return (
    <DrawerContent
      className="w-96 overflow-hidden mx-auto md:ml-4"
      handle={showHandle}
    >
      <VisuallyHidden>
        <DrawerHeader>
          <DrawerTitle>Music Player</DrawerTitle>
          <DrawerDescription>Play OMA albums</DrawerDescription>
        </DrawerHeader>
      </VisuallyHidden>

      {(() => {
        switch (state) {
          case "album-list":
            return <AlbumList onSelect={onSelectAlbum} />;
          case "track-list":
            return <TrackList album={album!} />;
          case "playing":
          // return <Playing />;
          default:
            return null;
        }
      })()}

      <DrawerFooter className="flex-row w-full">
        {state === "track-list" && (
          <Button
            className="w-full"
            variant="secondary"
            onClick={() => setState("album-list")}
          >
            Back
          </Button>
        )}

        <DrawerClose asChild>
          <Button className="w-full" variant="secondary">
            Close
          </Button>
        </DrawerClose>
      </DrawerFooter>
    </DrawerContent>
  );
}
