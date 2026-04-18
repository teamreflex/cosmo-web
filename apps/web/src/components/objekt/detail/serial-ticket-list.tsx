import { m } from "@/i18n/messages";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { cn } from "@/lib/utils";
import { IconArrowsUpDown } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import SerialTicket from "./serial-ticket";

type SortKey = "serial" | "minted" | "status";
type SortDir = "asc" | "desc";

type Props = {
  collection: Objekt.Collection;
  tokens: Objekt.Token[];
  authenticated: boolean;
  pins: Set<number>;
  locked: Set<number>;
  onSelect: () => void;
};

export default function SerialTicketList({
  collection,
  tokens,
  authenticated,
  pins,
  locked,
  onSelect,
}: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("serial");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const sorted = useMemo(() => {
    const copy = [...tokens];
    copy.sort((a, b) => compare(a, b, sortKey, pins, locked));
    if (sortDir === "desc") copy.reverse();
    return copy;
  }, [tokens, sortKey, sortDir, pins, locked]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3 sm:px-5">
        <div className="flex items-baseline gap-2">
          <span className="font-cosmo text-sm font-black tracking-[0.14em] uppercase">
            {m.detail_your_serials()}
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            {m.detail_copies_count({ count: tokens.length.toString() })}
          </span>
        </div>
        <div className="flex items-center gap-1 font-mono text-[10px] tracking-[0.14em] uppercase">
          <SortButton
            active={sortKey === "serial"}
            dir={sortDir}
            onClick={() => toggleSort("serial")}
          >
            {m.detail_sort_serial()}
          </SortButton>
          <SortButton
            active={sortKey === "minted"}
            dir={sortDir}
            onClick={() => toggleSort("minted")}
          >
            {m.detail_sort_minted()}
          </SortButton>
          <SortButton
            active={sortKey === "status"}
            dir={sortDir}
            onClick={() => toggleSort("status")}
          >
            {m.detail_sort_status()}
          </SortButton>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {sorted.map((token) => (
          <SerialTicket
            key={token.tokenId}
            collection={collection}
            token={token}
            authenticated={authenticated}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

type SortButtonProps = {
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  children: React.ReactNode;
};

function SortButton({ active, dir, onClick, children }: SortButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border px-2 py-1 transition-colors",
        active
          ? "border-border bg-muted text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      <span>{children}</span>
      {active && (
        <IconArrowsUpDown
          className={cn(
            "size-3 transition-transform",
            dir === "desc" && "rotate-180",
          )}
        />
      )}
    </button>
  );
}

function compare(
  a: Objekt.Token,
  b: Objekt.Token,
  key: SortKey,
  pins: Set<number>,
  locked: Set<number>,
) {
  if (key === "serial") return a.serial - b.serial;
  if (key === "minted") {
    const aT = new Date(a.acquiredAt).getTime();
    const bT = new Date(b.acquiredAt).getTime();
    return aT - bT;
  }
  // status: pinned first, then tradable, then locked; tiebreak by serial
  const aRank = statusRank(a, pins, locked);
  const bRank = statusRank(b, pins, locked);
  if (aRank !== bRank) return aRank - bRank;
  return a.serial - b.serial;
}

function statusRank(
  token: Objekt.Token,
  pins: Set<number>,
  locked: Set<number>,
) {
  if (pins.has(token.tokenId)) return 0;
  if (token.transferable && !token.nonTransferableReason) return 1;
  if (locked.has(token.tokenId)) return 2;
  return 3;
}
