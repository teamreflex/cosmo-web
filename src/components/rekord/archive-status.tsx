import { fetchArchivedStatus } from "@/lib/server/cosmo/rekord";
import { TokenPayload } from "@/lib/universal/auth";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import { LuDisc3, LuHeart, LuUsers } from "react-icons/lu";
import { ReactNode } from "react";

type Props = {
  user: TokenPayload;
  artist: ValidArtist;
};

export default async function RekordArchiveStatus({ user, artist }: Props) {
  const archive = await fetchArchivedStatus(user!.accessToken, artist);

  return (
    <div className="flex flex-col gap-3 py-2">
      <h3 className="text-3xl text-center font-cosmo uppercase">
        Community Archives
      </h3>

      <p className="text-center">
        The Rekord is archived by {archive.followerCount} fans
      </p>

      <div className="flex flex-row gap-8 justify-center">
        <IconBlock
          count={archive.postCount}
          label="Archive"
          icon={<LuDisc3 />}
        />
        <IconBlock count={archive.likeCount} label="Like" icon={<LuHeart />} />
        <IconBlock
          count={archive.followerCount}
          label={archive.fandomName}
          icon={<LuUsers />}
        />
      </div>
    </div>
  );
}

function IconBlock({
  count,
  label,
  icon,
}: {
  count: number;
  label: string;
  icon: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="rounded-xl bg-cosmo-hover text-cosmo-text p-2">
        {icon}
      </div>
      <p className="font-semibold">{count}</p>
      <p className="text-sm">{label}</p>
    </div>
  );
}
