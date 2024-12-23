import { fetchActivityMyObjekts } from "@/lib/server/cosmo/activity";
import { TokenPayload } from "@/lib/universal/auth";
import { CosmoActivityMyObjektMember } from "@/lib/universal/cosmo/activity/my-objekt";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import Image from "next/image";
import { CSSProperties, Suspense } from "react";
import { cn } from "@/lib/utils";
import { lazy } from "react";
import Skeleton from "../skeleton/skeleton";
const ObjektChart = lazy(() => import("./objekt-chart"));

type Props = {
  artist: ValidArtist;
  user: TokenPayload;
};

export default async function ObjektsBlock({ user, artist }: Props) {
  const { totalCount, countByMember } = await fetchActivityMyObjekts(
    user.accessToken,
    artist
  );

  return (
    <div
      className={cn(
        "w-full min-h-56 gap-2 rounded-xl bg-accent mx-auto px-4 py-3",
        // desktop
        "sm:grid sm:grid-cols-2",
        // mobile
        "flex flex-col-reverse"
      )}
    >
      {/* members */}
      <div className="flex flex-col gap-1">
        {countByMember.map((member, i) => (
          <Member
            key={member.name}
            total={totalCount}
            member={member}
            isFirst={i === 0}
          />
        ))}
      </div>

      {/* chart */}
      <div className="flex justify-center md:justify-end">
        <Suspense
          fallback={
            <Skeleton className="h-full w-full aspect-video rounded-xl" />
          }
        >
          <ObjektChart members={countByMember} />
        </Suspense>
      </div>
    </div>
  );
}

type MemberProps = {
  total: number;
  member: CosmoActivityMyObjektMember;
  isFirst: boolean;
};

function Member({ total, member, isFirst }: MemberProps) {
  const css = {
    "--member-color": member.color,
  } as CSSProperties;

  const percentage = Math.floor((member.count / total) * 100);

  return (
    <div className="flex items-center justify-between" style={css}>
      <div className="flex gap-3 items-center">
        {/* image */}
        <div className="relative shrink-0 aspect-square h-8 w-8 rounded-full overflow-hidden ring-offset-2 ring-offset-accent ring-1 ring-(--member-color)">
          <Image src={member.profileImage} alt={member.name} fill={true} />
        </div>

        {/* info */}
        <div className="flex flex-col">
          <p className="font-semibold">{member.name}</p>
          <p className="text-sm text-muted-foreground">{percentage}%</p>
        </div>
      </div>

      <p className={cn("font-semibold", isFirst && "text-(--member-color)")}>
        {member.count}
      </p>
    </div>
  );
}
