import type { CosmoFilters, SetCosmoFilters } from "@/hooks/use-cosmo-filters";
import { useProfileContext } from "@/hooks/use-profile";
import { m } from "@/i18n/messages";
import { cn } from "@/lib/utils";
import type { CollectionDataSource } from "@apollo/util";
import type { Dispatch, SetStateAction } from "react";
import { getSources } from "./data-sources";
import FilterChip from "./filter-chip";

type Props = {
  filters: CosmoFilters;
  setFilters: SetCosmoFilters;
  dataSource: CollectionDataSource;
  setDataSource: Dispatch<SetStateAction<CollectionDataSource>>;
};

export default function FilterDataSource({
  filters,
  setFilters,
  dataSource,
  setDataSource,
}: Props) {
  const target = useProfileContext((state) => state.target);

  const sources = getSources();
  const available = sources.filter((s) =>
    s.isAvailable(target?.cosmo?.address),
  );
  const active = sources.find((s) => s.value === dataSource);

  function handleChange(source: CollectionDataSource) {
    // blockchain sources don't support gridable
    if (
      (source === "blockchain" || source === "blockchain-groups") &&
      filters.gridable
    ) {
      setFilters({ gridable: undefined });
    }
    setDataSource(source);
  }

  return (
    <FilterChip
      label={m.data_source_title()}
      valueLabel={active?.shortLabel.toLowerCase()}
      width={280}
      align="end"
    >
      {({ close }) => (
        <div className="flex flex-col py-1">
          {available.map((source) => {
            const selected = source.value === dataSource;
            return (
              <button
                key={source.value}
                type="button"
                onClick={() => {
                  handleChange(source.value);
                  close();
                }}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-2 text-left text-xs transition-colors hover:bg-accent",
                )}
              >
                <div className="shrink-0">{source.icon}</div>
                <div className="flex min-w-0 flex-col">
                  <span className="font-medium">{source.label}</span>
                  <span className="font-mono text-xxs text-muted-foreground">
                    {source.subtitle}
                  </span>
                </div>
                {selected && (
                  <span className="ml-auto font-mono text-[11px] text-cosmo">
                    ●
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </FilterChip>
  );
}
