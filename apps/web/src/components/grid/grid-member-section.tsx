import GridEditionRow from "@/components/grid/grid-edition-row";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useArtists } from "@/hooks/use-artists";
import type { MemberLedger, SeasonLedger } from "@/lib/universal/grid";
import { getSeasonColor } from "@/lib/universal/seasons";

type Props = {
  section: MemberLedger;
  isOwner: boolean;
  includedTokenIds: ReadonlySet<string>;
  onToggleToken: (tokenId: string) => void;
};

export default function GridMemberSection(props: Props) {
  const { getMember } = useArtists();
  const member = getMember(props.section.member);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Avatar className="size-8">
          <AvatarImage
            src={member?.profileImageUrl}
            alt={props.section.member}
          />
          <AvatarFallback style={{ backgroundColor: member?.primaryColorHex }}>
            {props.section.member.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <h2 className="font-cosmo text-2xl font-bold tracking-wide uppercase">
          {props.section.member}
        </h2>
      </div>

      {props.section.seasons.map((season) => (
        <SeasonBlock
          key={season.season}
          member={props.section.member}
          season={season}
          isOwner={props.isOwner}
          includedTokenIds={props.includedTokenIds}
          onToggleToken={props.onToggleToken}
        />
      ))}
    </div>
  );
}

function SeasonBlock(props: {
  member: string;
  season: SeasonLedger;
  isOwner: boolean;
  includedTokenIds: ReadonlySet<string>;
  onToggleToken: (tokenId: string) => void;
}) {
  const color = getSeasonColor(props.season.season);

  return (
    <div className="flex flex-col rounded-lg border border-border px-4 py-2">
      <div className="flex items-center gap-2 py-2">
        {color !== null && (
          <span
            aria-hidden
            className="size-2.5 rounded-full"
            style={{ backgroundColor: color }}
          />
        )}
        <h3 className="font-cosmo text-lg font-bold tracking-wide uppercase">
          {props.season.season}
        </h3>
      </div>

      <div className="flex flex-col divide-y divide-border">
        {props.season.editions.map((edition) => (
          <GridEditionRow
            key={edition.edition}
            member={props.member}
            season={props.season.season}
            edition={edition}
            isOwner={props.isOwner}
            includedTokenIds={props.includedTokenIds}
            onToggleToken={props.onToggleToken}
          />
        ))}
      </div>
    </div>
  );
}
