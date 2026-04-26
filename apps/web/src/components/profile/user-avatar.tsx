import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

type Props = {
  className?: string;
  username?: string;
  variant?: "circle" | "square";
};

export default function UserAvatar({
  className,
  username = "User",
  variant = "circle",
}: Props) {
  if (variant === "square") {
    return (
      <div
        className={cn(
          "relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-md bg-gradient-to-br from-cosmo to-cosmo/40 font-cosmo text-3xl leading-none font-black text-background uppercase",
          className,
        )}
        aria-label={username}
      >
        <span>{username.charAt(0).toUpperCase()}</span>
      </div>
    );
  }

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
