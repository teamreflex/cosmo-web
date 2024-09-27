import { search } from "@/lib/server/cosmo/auth";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import ProfileImage from "@/assets/profile.webp";
import { getSelectedArtist } from "@/lib/server/profiles";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { cn, PropsWithClassName } from "@/lib/utils";

type Props = {
  className?: string;
  token?: string;
  nickname: string;
};

export default async function UserAvatar({
  className,
  token,
  nickname,
}: Props) {
  const artist = getSelectedArtist();

  if (token === undefined) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger>
            <Fallback nickname={nickname} />
          </TooltipTrigger>
          <TooltipContent side="right">
            Sign in to view full profiles
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  try {
    var { results } = await search(token, nickname);
  } catch (err) {
    return <Fallback className={className} nickname={nickname} />;
  }

  const user = results.find(
    (u) => u.nickname.toLowerCase() === nickname.toLowerCase()
  );
  const profile = user?.profile.find(
    (p) => p.artistName.toLowerCase() === artist.toLowerCase()
  );

  if (profile === undefined) {
    return <Fallback className={className} nickname={nickname} />;
  }

  return (
    <Avatar className={cn("h-24 w-24", className)}>
      <AvatarFallback>{user!.nickname.charAt(0).toUpperCase()}</AvatarFallback>
      <AvatarImage src={profile.image.original} alt={user!.nickname} />
    </Avatar>
  );
}

type FallbackProps = PropsWithClassName<{
  nickname: string;
}>;

function Fallback({ className, nickname }: FallbackProps) {
  return (
    <Avatar className={cn("h-24 w-24", className)}>
      <AvatarFallback>{nickname.charAt(0).toUpperCase()}</AvatarFallback>
      <AvatarImage
        className="bg-cosmo-profile p-3"
        src={ProfileImage.src}
        alt={nickname}
      />
    </Avatar>
  );
}
