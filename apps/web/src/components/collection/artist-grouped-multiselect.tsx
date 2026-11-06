import { m } from "@/i18n/messages";
import { cn } from "@/lib/utils";
import { validArtists } from "@apollo/cosmo/types/common";
import type { ReactNode } from "react";
import type { ArtistValueToggle } from "./artist-value-toggle";

type ArtistInfo = {
  id: string;
  title: string;
  logoImageUrl: string;
};

type Group = {
  artist: ArtistInfo;
  items: string[];
};

type Props = {
  groups: Group[];
  /**
   * The artists a selection counts under, so it shows checked in their
   * groups; none means every group.
   */
  checkedUnder: readonly string[];
  selected: string[];
  onToggle: (change: ArtistValueToggle) => void;
  onClear?: () => void;
  selectedCount: number;
};

export default function ArtistGroupedMultiSelect({
  groups,
  checkedUnder,
  selected,
  onToggle,
  onClear,
  selectedCount,
}: Props) {
  return (
    <div>
      <div
        className={cn(
          "grid border-b border-border",
          groups.length === 1 ? "grid-cols-1" : "grid-cols-3",
        )}
      >
        {groups.map((group) => (
          <div
            key={group.artist.id}
            className="border-r border-border last:border-r-0"
          >
            <div className="flex items-center gap-1.5 px-2.5 pt-2 pb-1.5">
              <img
                src={group.artist.logoImageUrl}
                alt={group.artist.title}
                className="size-4 shrink-0 rounded-full"
              />
              <span className="text-xs font-semibold text-muted-foreground">
                {group.artist.title}
              </span>
            </div>
            <div className="flex flex-col px-1 pb-2">
              {group.items.map((item) => {
                const on =
                  (checkedUnder.length === 0 ||
                    checkedUnder.includes(group.artist.id)) &&
                  selected.includes(item);
                return (
                  <CheckRow
                    key={item}
                    checked={on}
                    onClick={() => {
                      const artist = validArtists.find(
                        (id) => id === group.artist.id,
                      );
                      if (artist === undefined) return;
                      onToggle({
                        artist,
                        value: item,
                        values: on
                          ? selected.filter((value) => value !== item)
                          : [...selected, item],
                      });
                    }}
                  >
                    {item}
                  </CheckRow>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xxs text-muted-foreground tabular-nums">
          {selectedCount === 0
            ? m.filter_none_selected()
            : m.filter_count_selected({ count: selectedCount.toString() })}
        </span>
        {selectedCount > 0 && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-xxs tracking-widest text-muted-foreground uppercase transition-colors hover:text-foreground"
          >
            {m.filter_clear()}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * One value in a multi-select list, with its checkbox before the label.
 */
export function CheckRow({
  checked,
  onClick,
  children,
}: {
  checked: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-sm px-1.5 py-1 text-left text-xs transition-colors hover:bg-accent"
    >
      <span
        className={cn(
          "flex size-3.5 shrink-0 items-center justify-center rounded-sm border",
          checked ? "border-cosmo bg-cosmo" : "border-border bg-transparent",
        )}
      >
        {checked && <span className="text-xxs font-bold text-white">✓</span>}
      </span>
      <span
        className={cn(
          "flex min-w-0 items-center gap-1.5",
          checked ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {children}
      </span>
    </button>
  );
}
