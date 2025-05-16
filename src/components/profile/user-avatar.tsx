import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import ProfileImage from "@/assets/profile.webp";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  username?: string;
};

export default function UserAvatar({ className, username = "User" }: Props) {
  return (
    <Avatar className={cn("h-20 w-20", className)}>
      <AvatarFallback>{username.charAt(0).toUpperCase()}</AvatarFallback>
      <AvatarImage
        className="bg-cosmo-profile p-3"
        src={ProfileImage.src}
        alt={username}
      />
    </Avatar>
  );
}
