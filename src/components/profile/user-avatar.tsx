import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import ProfileImage from "@/assets/profile.webp";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";
import { cn, PropsWithClassName } from "@/lib/utils";
import { getUserAvatar, getSelectedArtist } from "@/app/data-fetching";

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
  const artist = await getSelectedArtist();

  if (token === undefined) {
    return (
      <TooltipProvider>
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
    var user = await getUserAvatar(token, nickname);
  } catch (err) {
    return <Fallback className={className} nickname={nickname} />;
  }

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
    <Avatar className={cn("h-20 w-20", className)}>
      <AvatarFallback>{nickname.charAt(0).toUpperCase()}</AvatarFallback>
      <AvatarImage
        className="bg-cosmo-profile p-3"
        src={ProfileImage.src}
        alt={nickname}
      />
    </Avatar>
  );
}
