import { useArtists } from "@/hooks/use-artists";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

type Props = {
  member: string;
  className?: string;
};

/**
 * A member's profile image ringed in their colour, falling back to their initial for
 * names COSMO has no member entry for (units, groups).
 */
export default function MemberAvatar(props: Props) {
  const { getMember } = useArtists();
  const member = getMember(props.member);

  return (
    <Avatar
      style={{
        "--member-color": member?.primaryColorHex ?? "var(--color-cosmo)",
      }}
      className={cn("ring-2 ring-(--member-color)", props.className)}
    >
      {member && <AvatarImage src={member.profileImageUrl} alt={member.name} />}
      <AvatarFallback>{props.member.charAt(0)}</AvatarFallback>
    </Avatar>
  );
}
