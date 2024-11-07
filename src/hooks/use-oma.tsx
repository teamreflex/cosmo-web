"use client";

import { OMAStorageService } from "@/lib/client/music-db/service";
import {
  CosmoAlbumTrackDownload,
  CosmoAlbumWithTracks,
} from "@/lib/universal/cosmo/albums";
import { COSMO_ENDPOINT } from "@/lib/universal/cosmo/common";
import { QueryStatus, useMutation, useQuery } from "@tanstack/react-query";
import { ofetch } from "ofetch";
import { createContext, use } from "react";
import { useUserState } from "./use-user-state";

const queryOptions = {
  staleTime: Infinity,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
};

type OMAStorageContext = {
  storage: OMAStorageService | undefined;
  status: QueryStatus;
};

const OMAStorageContext = createContext<OMAStorageContext>({
  storage: undefined,
  status: "pending",
});

export function OMAStorageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data, status } = useQuery({
    queryKey: ["oma-storage"],
    queryFn: async () => {
      const service = new OMAStorageService();
      await service.initialize();
      return service;
    },
    ...queryOptions,
  });

  // ensures the service is initialized
  return (
    <OMAStorageContext
      value={{
        storage: data,
        status,
      }}
    >
      {data ? children : null}
    </OMAStorageContext>
  );
}

export function useAlbumStore(album: CosmoAlbumWithTracks) {
  const ctx = use(OMAStorageContext);
  if (ctx === undefined) {
    throw new Error("useAlbumStore must be used within a OMAStorageProvider");
  }

  return useMutation({
    mutationKey: ["oma-storage", "store-album", album.hid],
    mutationFn: async () => {
      return await ctx.storage?.storeAlbum(album);
    },
  });
}

export function useTrackDownload(albumHid: string) {
  const { token } = useUserState();
  const ctx = use(OMAStorageContext);
  if (ctx === undefined) {
    throw new Error(
      "useTrackDownload must be used within a OMAStorageProvider"
    );
  }

  return useQuery({
    queryKey: ["oma-storage", "download-authorization", albumHid],
    queryFn: async () => {
      // fetch download URLs
      const tracks = await ofetch<CosmoAlbumTrackDownload[]>(
        `/api/bff/v3/albums/${albumHid}/track/download-authorize`,
        {
          headers: {
            Authorization: `Bearer ${token!.accessToken}`,
          },
        }
      );

      // download each track MP3 and save to storage
      for (const track of tracks) {
        await ctx.storage?.downloadTrack(track);
      }

      return tracks;
    },
    ...queryOptions,
  });
}

export function useAlbums() {
  const ctx = use(OMAStorageContext);
  if (ctx === undefined) {
    throw new Error("useAlbums must be used within a OMAStorageProvider");
  }

  return useQuery({
    queryKey: ["oma-storage", "albums"],
    queryFn: async () => {
      return await ctx.storage?.getAlbums();
    },
    ...queryOptions,
  });
}

export function useAlbum(albumHid: string) {
  const ctx = use(OMAStorageContext);
  if (ctx === undefined) {
    throw new Error("useAlbum must be used within a OMAStorageProvider");
  }

  return useQuery({
    queryKey: ["oma-storage", "album", albumHid],
    queryFn: async () => {
      return await ctx.storage?.getAlbum(albumHid);
    },
    ...queryOptions,
  });
}

export function useTrackData(trackHid: string) {
  const ctx = use(OMAStorageContext);
  if (ctx === undefined) {
    throw new Error("useTrackData must be used within a OMAStorageProvider");
  }

  return useQuery({
    queryKey: ["oma-storage", "track-data", trackHid],
    queryFn: async () => {
      return await ctx.storage?.getTrackData(trackHid);
    },
    ...queryOptions,
  });
}
