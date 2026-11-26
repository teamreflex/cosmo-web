import { m } from "@/i18n/messages";
import { env } from "@/lib/env/client";
import { cn } from "@/lib/utils";
import { userAvatarUrl } from "@apollo/image";
import { useState } from "react";
import { Avatar, AvatarFallback } from "../ui/avatar";

/**
 * A deleted user shows a muted "?" with no picture, so nothing of the
 * account's name or image remains.
 */
type Props = {
  className?: string;
} & (
  | { deleted: true }
  | {
      deleted?: false;
      username?: string;
      /** R2 key of the user's profile picture, null for the squid */
      avatar: string | null;
      /** in view as the page opens, so the picture loads at once */
      priority?: boolean;
    }
);

/**
 * A user's profile picture in a circle, or the squid when they have none. A
 * picture that fails to load, such as one a cached payload still names after
 * its owner replaced it, falls back to the squid. Pictures are one request
 * per user, so unless `priority` each loads only as it nears the viewport.
 */
export default function UserAvatar({ className, ...props }: Props) {
  const [failed, setFailed] = useState<string | null>(null);

  if (props.deleted === true) {
    return (
      <Avatar
        className={cn("size-20", className)}
        aria-label={m.common_deleted_user()}
      >
        <AvatarFallback>?</AvatarFallback>
      </Avatar>
    );
  }

  const username = props.username ?? "User";
  const avatar = props.avatar === failed ? null : props.avatar;

  return (
    <span
      className={cn(
        "block size-20 shrink-0 overflow-hidden rounded-full",
        avatar === null ? "bg-cosmo-profile" : "bg-muted",
        className,
      )}
    >
      {avatar === null ? (
        // padded against the circle's own width, so the squid keeps its proportions at every size
        <img className="size-full p-[14%]" src="/profile.webp" alt={username} />
      ) : (
        <img
          className="size-full object-cover"
          src={userAvatarUrl(env.VITE_CDN_URL, avatar)}
          alt={username}
          decoding="async"
          loading={props.priority === true ? "eager" : "lazy"}
          onError={() => setFailed(avatar)}
        />
      )}
    </span>
  );
}
