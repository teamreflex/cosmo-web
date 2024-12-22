"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CosmoActivityRankingKind,
  CosmoActivityRankingNearResult,
  CosmoActivityRankingNearUser,
  CosmoActivityRankingResult,
} from "@/lib/universal/cosmo/activity/ranking";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import { baseUrl, cn, ordinal } from "@/lib/utils";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  LuChevronDown,
  LuChevronRight,
  LuChevronUp,
  LuMinus,
} from "react-icons/lu";
import { ofetch } from "ofetch";
import { useState } from "react";
import ProfileImage from "@/assets/profile.webp";
import { format } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import CalculatingError from "./calculating-error";

type Props = {
  artist: ValidArtist;
};

export default function RankingBlock({ artist }: Props) {
  const [kind, setKind] = useState<CosmoActivityRankingKind>(
    "hold_objekts_per_season"
  );

  const now = new Date();
  const formatted = format(now, "MMMM do, yyyy");

  return (
    <div className="w-full gap-2 mx-auto flex flex-col">
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <p className="text-xl font-semibold">Ranking</p>
          <p className="text-sm">As of {formatted}</p>
        </div>

        <Button variant="link" asChild>
          <Link href="/activity/ranking" className="flex items-center gap-2">
            <span>Details</span>
            <LuChevronRight className="w-5 h-5" />
          </Link>
        </Button>
      </div>

      {/* content */}
      <Tabs
        value={kind}
        onValueChange={(v) => setKind(v as CosmoActivityRankingKind)}
      >
        <TabsList className="flex justify-self-center w-fit mx-auto">
          <TabsTrigger value="hold_objekts_per_season">Objekt</TabsTrigger>
          <TabsTrigger value="grid_per_season">Grid</TabsTrigger>
        </TabsList>
      </Tabs>

      <RankingList artist={artist} kind={kind} />
    </div>
  );
}

type RankingListProps = {
  artist: ValidArtist;
  kind: CosmoActivityRankingKind;
};

const sortMap = {
  above: -1,
  current: 0,
  below: 1,
};

function RankingList({ artist, kind }: RankingListProps) {
  /**
   * useSuspenseQuery pre-renders and fetches on the server,
   * resulting in the user token not being available, and 401 errors.
   */
  const { data } = useSuspenseQuery({
    queryKey: ["activity-ranking", artist, kind, "0"],
    queryFn: async () => {
      const url = new URL(
        `/api/bff/v1/activity/artist-rank/near-people`,
        baseUrl()
      );
      return await ofetch<
        CosmoActivityRankingResult<CosmoActivityRankingNearResult>
      >(url.toString(), {
        query: {
          artistName: artist,
          kind,
          marginAbove: 1,
          marginBelow: 1,
        },
      });
    },
  });

  if (data.success === false) {
    return <CalculatingError error={data.error} />;
  }

  const sorted = data.data.nearPeoples.toSorted(
    (i) => sortMap[i.relativePosition]
  );

  return (
    <div className="flex flex-col">
      {sorted !== undefined &&
        sorted.map((item) => (
          <RankingItem
            key={item.rankNumber}
            artist={artist}
            kind={kind}
            item={item}
          />
        ))}
    </div>
  );
}

type RankingItemProps = {
  artist: ValidArtist;
  kind: CosmoActivityRankingKind;
  item: CosmoActivityRankingNearUser;
};

function RankingItem({ artist, kind, item }: RankingItemProps) {
  const user = item.representUser.user;
  const image = item.representUser.profiles.find(
    (p) => p.artistName === artist
  )?.profileImageUrl;

  const countString =
    item.nearPeopleCount > 1 ? `and ${item.nearPeopleCount - 1} more` : null;
  const kindString =
    kind === "hold_objekts_per_season" ? "Objekts owned" : "Grids completed";

  return (
    <div
      className={cn(
        "flex gap-6 items-center h-20 px-2",
        item.relativePosition === "current" && "bg-accent rounded-lg"
      )}
    >
      {/* ranking position */}
      <div className="flex items-center justify-center">
        {item.relativePosition === "above" && (
          <LuChevronUp className="h-4 w-4" />
        )}
        {item.relativePosition === "current" && <LuMinus className="h-4 w-4" />}
        {item.relativePosition === "below" && (
          <LuChevronDown className="h-4 w-4" />
        )}
      </div>

      {/* profile image */}
      <Avatar className="h-10 w-10">
        <AvatarFallback>{user.nickname.charAt(0).toUpperCase()}</AvatarFallback>

        {image !== undefined ? (
          <AvatarImage src={image} alt={user.nickname} />
        ) : (
          <AvatarImage
            className="bg-cosmo-profile p-3"
            src={ProfileImage.src}
            alt={user.nickname}
          />
        )}
      </Avatar>

      {/* ranking info */}
      <div className="flex flex-col">
        <p
          className={cn(
            "font-semibold",
            item.relativePosition === "current" && "text-cosmo-text"
          )}
        >
          {ordinal(item.rankNumber)} place
        </p>
        <p className="text-sm">
          {user.nickname} {countString}
        </p>
        <p className="text-sm">
          {item.rankData} {kindString}
        </p>
      </div>
    </div>
  );
}
