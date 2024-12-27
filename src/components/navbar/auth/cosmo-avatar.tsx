import { CosmoProfile } from "@/lib/universal/cosmo/auth";
import { ValidArtist } from "@/lib/universal/cosmo/common";
import ProfileImage from "@/assets/profile.webp";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { TokenPayload } from "@/lib/universal/auth";
import { getUserAvatar } from "@/app/data-fetching";
import AuthFallback from "../auth-fallback";

type Props = {
  token: TokenPayload | undefined;
  artist: ValidArtist;
  nickname?: string;
};

export default async function CosmoAvatar({ token, artist, nickname }: Props) {
  if (token === undefined || nickname === undefined) {
    return <CosmoProfileImage nickname="Anonymous" />;
  }

  try {
    var user = await getUserAvatar(token.accessToken, nickname);
  } catch (err) {
    return <AuthFallback />;
  }

  const profile = user?.profile.find(
    (p) => p.artistName.toLowerCase() === artist.toLowerCase()
  );

  return <CosmoProfileImage nickname={nickname} profile={profile} />;
}

type CosmoProfileImageProps = {
  nickname: string;
  profile?: CosmoProfile;
};

function CosmoProfileImage({ nickname, profile }: CosmoProfileImageProps) {
  const hasImage = profile !== undefined;
  const src = profile?.image.thumbnail ?? ProfileImage.src;

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
