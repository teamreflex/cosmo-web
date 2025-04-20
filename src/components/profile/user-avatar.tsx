import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import ProfileImage from "@/assets/profile.webp";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  nickname: string;
};

export default async function UserAvatar({ className, nickname }: Props) {
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
