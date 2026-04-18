import type { CosmoFilters, SetCosmoFilters } from "@/hooks/use-cosmo-filters";
import { filtersAreDirty } from "@/hooks/use-filters";
import { m } from "@/i18n/messages";
import { IconX } from "@tabler/icons-react";

type Props = {
  filters: CosmoFilters;
  setFilters: SetCosmoFilters;
};

export default function ResetFilters(props: Props) {
  const disabled = !filtersAreDirty(props.filters);

  if (disabled) return null;

  const count = countActive(props.filters);

  function handleReset() {
    props.setFilters({
      member: undefined,
      artist: undefined,
      sort: undefined,
      class: undefined,
      season: undefined,
      on_offline: undefined,
      transferable: undefined,
      gridable: undefined,
      collectionNo: undefined,
    });
  }

  return (
    <button
      type="button"
      onClick={handleReset}
      aria-label={m.aria_reset_filters()}
      className="inline-flex h-8 items-center gap-1 rounded-sm px-2 text-[11px] tracking-[0.14em] text-muted-foreground uppercase transition-colors hover:text-foreground"
    >
      <IconX className="size-3" />
      <span>{m.filter_reset()}</span>
      {count > 0 && <span className="font-mono text-xxs">({count})</span>}
    </button>
  );
}

function countActive(filters: CosmoFilters) {
  let n = 0;
  for (const [key, value] of Object.entries(filters)) {
    if (key === "sort") {
      if (value !== undefined && value !== "newest") n += 1;
      continue;
    }
    if (value === undefined || value === null || value === false) continue;
    if (Array.isArray(value)) n += value.length;
    else n += 1;
  }
  return n;
}
