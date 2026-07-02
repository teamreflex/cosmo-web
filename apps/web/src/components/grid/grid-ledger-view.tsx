import GridMemberOverview from "@/components/grid/grid-member-overview";
import GridMemberSection from "@/components/grid/grid-member-section";
import GridUnitPanel from "@/components/grid/grid-unit-panel";
import { useUserState } from "@/hooks/use-user-state";
import { m } from "@/i18n/messages";
import { gridLedgerQuery } from "@/lib/queries/grid";
import { applyGridOverrides } from "@/lib/universal/grid";
import type { ValidArtist } from "@apollo/cosmo/types/common";
import { isEqual } from "@apollo/util";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

type Props = {
  address: string;
  artist: ValidArtist;
  member: string | undefined;
  onSelectMember: (member: string) => void;
};

export default function GridLedgerView(props: Props) {
  const { cosmo } = useUserState();
  const { data } = useSuspenseQuery(
    gridLedgerQuery(props.address, props.artist),
  );

  // view-local inclusion of non-transferable tokens, resets on reload
  const [includedTokenIds, setIncludedTokenIds] = useState<Set<string>>(
    new Set(),
  );
  const ledger = useMemo(
    () => applyGridOverrides(data, includedTokenIds),
    [data, includedTokenIds],
  );

  const isOwner = isEqual(cosmo?.address, props.address);

  function toggleToken(tokenId: string) {
    setIncludedTokenIds((prev) => {
      const next = new Set(prev);
      if (next.has(tokenId)) next.delete(tokenId);
      else next.add(tokenId);
      return next;
    });
  }

  if (props.member === undefined) {
    return (
      <GridMemberOverview
        ledger={ledger}
        onSelectMember={props.onSelectMember}
      />
    );
  }

  const section = ledger.members.find((s) => s.member === props.member);
  const units =
    ledger.units?.filter(
      (season) =>
        season.capacities.some((c) => c.member === props.member) ||
        season.pairs.some((p) => p.members.includes(props.member ?? "")),
    ) ?? [];

  if (!section && units.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        {m.grid_no_data()}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {section && (
        <GridMemberSection
          section={section}
          isOwner={isOwner}
          includedTokenIds={includedTokenIds}
          onToggleToken={toggleToken}
        />
      )}
      {units.map((season) => (
        <GridUnitPanel
          key={season.season}
          season={season}
          member={props.member ?? ""}
        />
      ))}
    </div>
  );
}
