import { m } from "@/i18n/messages";
import type { GridLedger, MemberLedger } from "@/lib/universal/grid";

type Props = {
  ledger: GridLedger;
  onSelectMember: (member: string) => void;
};

/**
 * One card per member the target owns grid-relevant objekts for, as an index
 * into the per-member ledgers.
 */
export default function GridMemberOverview({ ledger, onSelectMember }: Props) {
  if (ledger.members.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        {m.grid_no_data()}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {ledger.units !== null && ledger.units.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {ledger.units.map((season) => (
            <span key={season.season}>
              <span className="font-semibold text-foreground">
                {season.season}
              </span>{" "}
              · {m.grid_units_title()}:{" "}
              {m.grid_max_units({ count: season.maxUnits.toString() })}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {ledger.members.map((section) => (
          <MemberCard
            key={section.member}
            section={section}
            onClick={() => onSelectMember(section.member)}
          />
        ))}
      </div>
    </div>
  );
}

function MemberCard({
  section,
  onClick,
}: {
  section: MemberLedger;
  onClick: () => void;
}) {
  let completable = 0;
  let specials = 0;
  for (const season of section.seasons) {
    for (const edition of season.editions) {
      completable += edition.completable;
      specials += edition.rewards[0].owned + edition.rewards[1].owned;
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col gap-1 rounded-lg border border-border p-3 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
    >
      <span className="font-semibold">{section.member}</span>
      <span
        className={
          completable > 0
            ? "text-sm font-semibold text-cosmo-text"
            : "text-sm text-muted-foreground"
        }
      >
        {m.grid_completable({ count: completable.toString() })}
      </span>
      <span className="text-xs text-muted-foreground">
        {m.grid_overview_specials({ count: specials.toString() })}
      </span>
    </button>
  );
}
