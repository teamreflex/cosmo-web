import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

type Props = {
  className?: string;
  username?: string;
};

export default function UserAvatar({ className, username = "User" }: Props) {
  return (
    <Avatar className={cn("size-20", className)}>
      <AvatarFallback>{username.charAt(0).toUpperCase()}</AvatarFallback>
      <AvatarImage
        className="bg-cosmo-profile p-3"
        src="/profile.webp"
        alt={username}
      />
    </Avatar>
  );
}
