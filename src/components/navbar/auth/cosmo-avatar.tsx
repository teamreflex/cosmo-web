import { CosmoProfile } from "@/lib/universal/cosmo/auth";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import ProfileImage from "@/assets/profile.webp";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { TokenPayload } from "@/lib/universal/auth";
import { getCosmoUser } from "@/app/data-fetching";

type Props = {
  token: TokenPayload | undefined;
  artist: ValidArtist;
};

export default async function CosmoAvatar({ token, artist }: Props) {
  if (!token) {
    return (
      <CosmoProfileImage nickname="Anonymous" artist={artist} profiles={[]} />
    );
  }

  const cosmoUser = await getCosmoUser(token.accessToken);
  return (
    <CosmoProfileImage
      nickname={cosmoUser.nickname}
      artist={artist}
      profiles={cosmoUser.profile}
    />
  );
}

type CosmoProfileImageProps = {
  nickname: string;
  artist: ValidArtist;
  profiles: CosmoProfile[];
};

function CosmoProfileImage({
  nickname,
  artist,
  profiles,
}: CosmoProfileImageProps) {
  const profileImage = profiles.find(
    (p) => p.artistName.toLowerCase() === artist.toLowerCase()
  );

  const hasImage = profileImage !== undefined;
  const src = profileImage?.image.thumbnail ?? ProfileImage.src;

  return (
    <Avatar className="ring-2 ring-white/30 group-data-[state=open]:ring-cosmo transition-colors">
      <AvatarFallback>{nickname.charAt(0).toUpperCase()}</AvatarFallback>
      <AvatarImage
        src={src}
        alt={nickname}
        className={cn(!hasImage && "bg-cosmo-profile p-1")}
      />
    </Avatar>
  );
}
