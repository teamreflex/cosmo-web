import { m } from "@/i18n/messages";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

/**
 * A deleted user shows a muted "?" with no picture, so nothing of the
 * account's name or image remains.
 */
type Props = {
  className?: string;
  variant?: "circle" | "square";
} & ({ deleted: true } | { deleted?: false; username?: string });

export default function UserAvatar({
  className,
  variant = "circle",
  ...props
}: Props) {
  if (props.deleted === true) {
    return variant === "square" ? (
      <div
        className={cn(
          "relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted font-cosmo text-3xl leading-none font-black text-muted-foreground",
          className,
        )}
        aria-label={m.common_deleted_user()}
      >
        <span>?</span>
      </div>
    ) : (
      <Avatar
        className={cn("size-20", className)}
        aria-label={m.common_deleted_user()}
      >
        <AvatarFallback>?</AvatarFallback>
      </Avatar>
    );
  }

  const username = props.username ?? "User";

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
