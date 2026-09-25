import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useArtists } from "@/hooks/use-artists";
import { useFilterData } from "@/hooks/use-filter-data";
import { m } from "@/i18n/messages";
import { sortLabel } from "@/lib/client/objekt-util";
import type { NeighbourSuggestion } from "@/lib/universal/binders";
import { getSeasonColor } from "@/lib/universal/seasons";
import { classSort, cn } from "@/lib/utils";
import { validOnlineTypes, validSorts } from "@apollo/cosmo/types/common";
import type { ValidArtist } from "@apollo/cosmo/types/common";
import { Suspense, useId } from "react";
import type { ComponentProps, ReactNode } from "react";
import type {
  FlagKey,
  PickerFilterAction,
  PickerFilters,
} from "./picker-filters";
import { suggestionSource } from "./picker-filters";
import SuggestionChip from "./suggestion-chip";

type Props = {
  id: string;
  open: boolean;
  filters: PickerFilters;
  suggestion: NeighbourSuggestion | null;
  shown: number;
  onChange: (action: PickerFilterAction) => void;
  onClose: () => void;
};

/**
 * Every filter besides the artist, in a panel that slides over the grid.
 * Member, season and class only apply within one artist, so they wait until
 * an artist is picked.
 */
export default function PickerFilterPanel({
  id,
  open,
  filters,
  suggestion,
  shown,
  onChange,
  onClose,
}: Props) {
  return (
    <div
      id={id}
      role="region"
      aria-label={m.common_filters()}
      inert={!open}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
      className={cn(
        "absolute inset-0 z-10 flex flex-col border-l border-border bg-popover transition-[translate,opacity] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]",
        !open &&
          "pointer-events-none translate-x-[102%] motion-reduce:translate-x-0 motion-reduce:opacity-0",
      )}
    >
      <div className="grid flex-1 panel-scrollbar content-start gap-4 overflow-y-auto overscroll-contain px-3 py-3.5">
        {suggestion !== null && (
          <Group title={m.binder_picker_suggested()}>
            <div className="flex">
              <SuggestionChip
                suggestion={suggestion}
                onApply={() => onChange({ type: "suggestion", suggestion })}
              />
            </div>
            <span className="font-mono text-[10.5px] text-muted-foreground">
              {suggestionSource(suggestion, "matches")}
            </span>
          </Group>
        )}

        {filters.artist === null ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {m.binder_picker_pick_artist()}
          </p>
        ) : (
          <Suspense>
            <ArtistFilters
              artist={filters.artist}
              filters={filters}
              onChange={onChange}
            />
          </Suspense>
        )}

        <Group title={m.filter_type()}>
          <Options>
            {validOnlineTypes.map((type) => (
              <Option
                key={type}
                pressed={filters.onOffline === type}
                onClick={() =>
                  onChange({
                    type: "onOffline",
                    value: filters.onOffline === type ? null : type,
                  })
                }
              >
                {type === "offline"
                  ? m.filter_online_physical()
                  : m.filter_online_digital()}
              </Option>
            ))}
          </Options>
        </Group>

        <Group title={m.binder_picker_ownership()}>
          <Toggle
            flag="transferable"
            label={m.filter_transferable_only()}
            filters={filters}
            onChange={onChange}
          />
          <Toggle
            flag="hideLocked"
            label={m.filter_locked_hide()}
            filters={filters}
            onChange={onChange}
          />
        </Group>

        <Group title={m.binder_picker_binder()}>
          <Toggle
            flag="notInBinder"
            label={m.binder_picker_not_in_binder()}
            filters={filters}
            onChange={onChange}
          />
        </Group>

        <Group title={m.filter_sort()}>
          <Options>
            {validSorts.map((sort) => (
              <Option
                key={sort}
                pressed={filters.sort === sort}
                onClick={() => onChange({ type: "sort", sort })}
              >
                {sortLabel(sort)}
              </Option>
            ))}
          </Options>
        </Group>
      </div>

      <div className="flex gap-2 border-t border-border px-3 py-2.5">
        <Button
          variant="outline"
          className="h-[38px] flex-1 rounded-md font-semibold"
          onClick={() => onChange({ type: "reset" })}
        >
          {m.common_reset()}
        </Button>
        <Button
          variant="cosmo"
          className="h-[38px] flex-2 rounded-md font-semibold"
          onClick={onClose}
        >
          {m.binder_picker_show({ count: shown })}
        </Button>
      </div>
    </div>
  );
}

type ArtistFiltersProps = {
  artist: ValidArtist;
  filters: PickerFilters;
  onChange: (action: PickerFilterAction) => void;
};

/**
 * Member, season and class options for the chosen artist. Seasons and classes
 * come from the cached filter data.
 */
function ArtistFilters({ artist, filters, onChange }: ArtistFiltersProps) {
  const { getArtist } = useArtists();
  const { seasons, classes } = useFilterData();
  const lower = artist.toLowerCase();

  return (
    <>
      <Group title={m.objekt_attribute_member()}>
        <Options>
          {(getArtist(artist)?.artistMembers ?? []).map((member) => (
            <Option
              key={member.id}
              pressed={filters.member.includes(member.name)}
              onClick={() =>
                onChange({ type: "toggle", key: "member", value: member.name })
              }
              className="pl-1"
            >
              <img
                src={member.profileImageUrl}
                alt=""
                className="size-[22px] rounded-full bg-muted object-cover"
              />
              {member.name}
            </Option>
          ))}
        </Options>
      </Group>

      <Group title={m.common_season()}>
        <Options>
          {(
            seasons.find((s) => s.artist.id.toLowerCase() === lower)?.seasons ??
            []
          ).map((season) => (
            <Option
              key={season}
              pressed={filters.season.includes(season)}
              seasonColor={getSeasonColor(season)}
              onClick={() =>
                onChange({ type: "toggle", key: "season", value: season })
              }
            >
              {season}
            </Option>
          ))}
        </Options>
      </Group>

      <Group title={m.common_class()}>
        <Options>
          {(
            classes.find((c) => c.artist.id.toLowerCase() === lower)?.classes ??
            []
          )
            .toSorted((a, b) => classSort(a, b, artist))
            .map((className) => (
              <Option
                key={className}
                pressed={filters.class.includes(className)}
                onClick={() =>
                  onChange({ type: "toggle", key: "class", value: className })
                }
              >
                {className}
              </Option>
            ))}
        </Options>
      </Group>
    </>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-2">
      <h3 className="font-mono text-[10.5px] font-medium tracking-[0.12em] text-muted-foreground uppercase">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Options({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-1.5">{children}</div>;
}

type OptionProps = ComponentProps<"button"> & {
  pressed: boolean;
  seasonColor?: string | null;
};

/**
 * A toggleable filter option. Seasons carry their own colour, like everywhere
 * else seasons are shown.
 */
function Option({
  pressed,
  seasonColor,
  className,
  style,
  ...props
}: OptionProps) {
  const seasonal = seasonColor !== undefined && seasonColor !== null;

  return (
    <button
      type="button"
      aria-pressed={pressed}
      style={seasonal ? { ...style, "--season-color": seasonColor } : style}
      className={cn(
        "inline-flex h-[30px] items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-[12.5px] text-foreground/80 transition-colors hover:bg-muted",
        pressed && "border-cosmo bg-cosmo/20 text-foreground hover:bg-cosmo/25",
        seasonal &&
          "border-(--season-color)/45 bg-(--season-color)/8 hover:bg-(--season-color)/15 dark:text-(--season-color)",
        seasonal &&
          pressed &&
          "border-(--season-color) bg-(--season-color)/20 hover:bg-(--season-color)/25",
        className,
      )}
      {...props}
    />
  );
}

type ToggleProps = {
  flag: FlagKey;
  label: string;
  filters: PickerFilters;
  onChange: (action: PickerFilterAction) => void;
};

function Toggle({ flag, label, filters, onChange }: ToggleProps) {
  const id = useId();

  return (
    <div className="flex items-center justify-between gap-2.5 py-1">
      <label htmlFor={id} className="text-[13px] text-foreground/80">
        {label}
      </label>
      <Switch
        id={id}
        checked={filters[flag]}
        onCheckedChange={(value) =>
          onChange({ type: "flag", key: flag, value })
        }
      />
    </div>
  );
}
