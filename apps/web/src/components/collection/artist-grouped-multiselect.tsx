import { cn } from "@/lib/utils";

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
  activeArtist: string | undefined;
  selected: string[];
  onToggle: (artistId: string, item: string, checked: boolean) => void;
  onClear?: () => void;
  selectedCount: number;
};

export default function ArtistGroupedMultiSelect({
  groups,
  activeArtist,
  selected,
  onToggle,
  onClear,
  selectedCount,
}: Props) {
  return (
    <div>
      <div className="grid grid-cols-3 border-b border-border">
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
              <span className="font-mono text-[10px] tracking-[0.14em] text-muted-foreground uppercase">
                {group.artist.title}
              </span>
            </div>
            <div className="flex flex-col px-1 pb-2">
              {group.items.map((item) => {
                const on =
                  activeArtist === group.artist.id && selected.includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => onToggle(group.artist.id, item, !on)}
                    className="flex w-full items-center gap-2 rounded-sm px-1.5 py-1 text-left text-xs transition-colors hover:bg-accent"
                  >
                    <span
                      className={cn(
                        "flex size-3.5 shrink-0 items-center justify-center rounded-sm border",
                        on
                          ? "border-cosmo bg-cosmo"
                          : "border-border bg-transparent",
                      )}
                    >
                      {on && (
                        <span className="text-[9px] font-bold text-white">
                          ✓
                        </span>
                      )}
                    </span>
                    <span
                      className={cn(
                        on ? "text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {item}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between px-3 py-2">
        <span className="font-mono text-[10px] text-muted-foreground">
          {selectedCount === 0 ? "none selected" : `${selectedCount} selected`}
        </span>
        {selectedCount > 0 && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase transition-colors hover:text-foreground"
          >
            clear
          </button>
        )}
      </div>
    </div>
  );
}
