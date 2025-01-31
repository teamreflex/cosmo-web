"use client";

import Skeleton from "@/components/skeleton/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CosmoActivityRankingKind,
  CosmoActivityRankingTopEntry,
} from "@/lib/universal/cosmo/activity/ranking";
import { CosmoArtistWithMembersBFF } from "@/lib/universal/cosmo/artists";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import { useSuspenseQueries, useSuspenseQuery } from "@tanstack/react-query";
import Image from "next/image";
import { Suspense, useState } from "react";
import ProfileImage from "@/assets/profile.webp";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ordinal } from "@/lib/utils";
import Portal from "@/components/portal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle } from "lucide-react";
import { ErrorBoundary } from "react-error-boundary";
import CalculatingError from "./calculating-error";
import { lastRankQuery, nearPeopleQuery, topRankQuery } from "./queries";
import { kindMap } from "./common";

type Props = {
  selectedArtist: ValidArtist;
  artists: CosmoArtistWithMembersBFF[];
};

export default function TopRanking({ selectedArtist, artists }: Props) {
  const [memberId, setMemberId] = useState("0");
  const [tab, setTab] = useState<CosmoActivityRankingKind>(
    "hold_objekts_per_season"
  );

  const artist = artists.find(
    (a) => a.name.toLowerCase() === selectedArtist.toLowerCase()
  )!;

  return (
    <main className="container flex flex-col gap-2 py-2">
      {/* header */}
      <div className="flex items-center">
        <div className="w-full flex flex-col md:flex-row gap-2 md:items-center md:justify-between">
          <div className="flex items-center gap-2 justify-between md:justify-normal">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-cosmo uppercase">Ranking</h1>
              <MyRankHelpDialog />
            </div>
            <div id="ranking-season" />
          </div>

          <div className="flex items-center justify-center md:justify-normal gap-2">
            {tab !== "gravity_per_como_in_season" && (
              <Select value={memberId} onValueChange={setMemberId}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">
                    <div className="flex flex-row items-center gap-2">
                      <Image
                        src={artist.logoImageUrl}
                        alt={artist.title}
                        width={24}
                        height={24}
                        className="rounded-full"
                      />
                      <span>{artist.title}</span>
                    </div>
                  </SelectItem>

                  {artist.artistMembers.map((member) => (
                    <SelectItem key={member.name} value={member.id.toString()}>
                      <div className="flex flex-row items-center gap-2">
                        <Image
                          src={member.profileImageUrl}
                          alt={member.name}
                          width={24}
                          height={24}
                          className="rounded-full"
                        />
                        <span>{member.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Tabs
              value={tab}
              onValueChange={(v) => setTab(v as CosmoActivityRankingKind)}
            >
              <TabsList className="flex justify-self-center w-fit mx-auto">
                <TabsTrigger value="hold_objekts_per_season">
                  Objekt
                </TabsTrigger>
                <TabsTrigger value="grid_per_season">Grid</TabsTrigger>
                <TabsTrigger value="gravity_per_como_in_season">
                  Gravity
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      {/* content */}
      <div className="w-full sm:w-2/3 md:w-1/2 flex flex-col gap-4 mx-auto">
        <ErrorBoundary
          fallback={
            <p className="text-center text-sm font-semibold">
              Error loading rank
            </p>
          }
        >
          <Suspense
            fallback={
              <div className="flex flex-col gap-2">
                <h3 className="text-xl font-semibold">My Rank</h3>
                <Skeleton className="h-[218px] rounded-lg" />
              </div>
            }
          >
            <MyRank artist={selectedArtist} kind={tab} memberId={memberId} />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary
          fallback={
            <p className="text-center text-sm font-semibold">
              Error loading top 10
            </p>
          }
        >
          <Suspense
            fallback={
              <div className="flex flex-col gap-2">
                <h3 className="text-xl font-semibold">TOP 10</h3>
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="flex gap-4 items-center">
                      {/* ranking position */}
                      <Skeleton className="w-5 h-5 rounded-full" />

                      {/* profile image */}
                      <Skeleton className="h-10 w-10 rounded-full" />

                      {/* name */}
                      <div className="grow">
                        <Skeleton className="h-3 w-24 rounded-full" />
                      </div>

                      {/* ranking data */}
                      <Skeleton className="w-5 h-5 rounded-full" />
                    </div>
                  ))}
                </div>
              </div>
            }
          >
            <RankingList
              artist={selectedArtist}
              kind={tab}
              memberId={memberId}
            />
          </Suspense>
        </ErrorBoundary>
      </div>
    </main>
  );
}

type MyRankProps = {
  artist: ValidArtist;
  kind: CosmoActivityRankingKind;
  memberId: string;
};

function MyRank({ artist, kind, memberId }: MyRankProps) {
  const [nearRank, lastRank] = useSuspenseQueries({
    queries: [
      nearPeopleQuery(artist, kind, memberId),
      lastRankQuery(artist, memberId),
    ],
  });

  if (nearRank.data.success === false || lastRank.data.success === false) {
    return <CalculatingError error="Rankings are being calculated" />;
  }

  const { data: nearRankData } = nearRank;
  const { data: lastRankData } = lastRank;
  const rankInfo = lastRankData.data
    .filter(Boolean)
    .find((lr) => lr.kind === kind);
  if (!rankInfo) {
    return null;
  }

  const type = kindMap[kind];

  if (nearRankData !== undefined) {
    const current = nearRankData.data.nearPeople.find(
      (p) => p.relativePosition === "current"
    );
    const above = nearRankData.data.nearPeople.find(
      (p) => p.relativePosition === "above"
    );
    const below = nearRankData.data.nearPeople.find(
      (p) => p.relativePosition === "below"
    );

    const percentage =
      current !== undefined
        ? ((current.rankNumber / rankInfo.maxRank) * 100).toFixed(2)
        : 0;

    return (
      <div className="flex flex-col gap-2">
        <h3 className="text-xl font-semibold">My Rank</h3>
        <div className="grid grid-cols-2 grid-rows-2 bg-accent rounded-lg">
          <div className="col-span-2 flex flex-col border-b border-foreground/25 p-4">
            {/* current */}
            {current !== undefined && (
              <div className="contents">
                <p className="font-semibold text-lg">
                  {current.representUser.nickname}
                </p>
                <p className="font-semibold text-xl">
                  {ordinal(current.rankNumber)} (Top {percentage}%)
                </p>
                <p className="text-sm">
                  Number of {type}: {current.rankData}
                </p>
              </div>
            )}
          </div>

          {/* above */}
          <div className="flex flex-col justify-center gap-1 text-sm p-4 border-r border-foreground/25">
            {above !== undefined && (
              <div className="contents">
                <p className="font-semibold">Rank just above</p>
                <p className="font-semibold text-red-500">
                  {ordinal(above.rankNumber)} place
                </p>
                <p>
                  {above.rankData} {type}
                </p>
              </div>
            )}
          </div>

          {/* below */}
          <div className="flex flex-col justify-center gap-1 text-sm p-4">
            {below !== undefined && (
              <div className="contents">
                <p className="font-semibold">Rank just below</p>
                <p className="font-semibold text-blue-500">
                  {ordinal(below.rankNumber)} place
                </p>
                <p>
                  {below.rankData} {type}
                </p>
              </div>
            )}
          </div>
        </div>

        <Portal to="#ranking-season">
          <p className="text-sm font-semibold">{nearRankData.data.season}</p>
        </Portal>
      </div>
    );
  }

  return null;
}

function MyRankHelpDialog() {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="secondary" size="profile">
          <HelpCircle className="h-5 w-5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Ranking: My Rank</AlertDialogTitle>
        </AlertDialogHeader>

        <div className="flex flex-col gap-4 text-sm text-muted-foreground">
          <div className="flex flex-col gap-1">
            <p>
              Your Objekt Ranking score reflects how many Objekts you own when
              the ranking is updated.
            </p>

            <p>
              Only Objekts with the same Season with the current Season will be
              counted.
            </p>

            <p>
              Rankings are calculated based on either the group as a whole or
              individual members.
            </p>
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogAction>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

type RankingListProps = {
  artist: ValidArtist;
  kind: CosmoActivityRankingKind;
  memberId: string;
};

function RankingList({ artist, kind, memberId }: RankingListProps) {
  const { data } = useSuspenseQuery(topRankQuery(artist, kind, memberId));

  if (data.success) {
    return (
      <div className="flex flex-col gap-2">
        <h3 className="text-xl font-semibold">TOP 10</h3>
        <div className="flex flex-col gap-2">
          {data.data.rankItems.map((item) => (
            <RankingRow key={item.user.nickname} artist={artist} item={item} />
          ))}
        </div>
      </div>
    );
  }

  return null;
}

type RankingRowProps = {
  artist: ValidArtist;
  item: CosmoActivityRankingTopEntry;
};

function RankingRow({ artist, item }: RankingRowProps) {
  const { nickname, userProfile } = item.user;
  const image = userProfile.find(
    (p) => p.artistId === artist
  )?.profileImageThumbnail;

  return (
    <div className="flex gap-4 items-center">
      {/* ranking position */}
      <p className="font-semibold text-center w-5">{item.rankNumber}</p>

      {/* profile image */}
      <Avatar className="h-10 w-10">
        <AvatarFallback>{nickname.charAt(0).toUpperCase()}</AvatarFallback>

        {image !== undefined ? (
          <AvatarImage src={image} alt={nickname} />
        ) : (
          <AvatarImage
            className="bg-cosmo-profile p-2"
            src={ProfileImage.src}
            alt={nickname}
          />
        )}
      </Avatar>

      {/* name */}
      <p className="grow">{nickname}</p>

      {/* ranking data */}
      <p className="font-semibold">{item.rankData}</p>
    </div>
  );
}
