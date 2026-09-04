import { m } from "@/i18n/messages";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { useMemo, useState } from "react";
import SerialTicket from "./serial-ticket";
import SortButton, { type SortDir } from "./sort-button";

type SortKey = "serial" | "received" | "status";

type Props = {
  collection: Objekt.Collection;
  tokens: Objekt.Token[];
  authenticated: boolean;
  pins: Set<number>;
  locked: Set<number>;
};

export default function SerialTicketList({
  collection,
  tokens,
  authenticated,
  pins,
  locked,
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

  const title = authenticated
    ? m.detail_owned_objekts_self()
    : m.detail_owned_objekts_other();

  return (
    <div className="flex min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3 sm:px-5">
        <div className="flex items-baseline gap-2">
          <span className="hidden font-cosmo text-sm font-black tracking-[0.14em] uppercase sm:block">
            {title}
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            {m.detail_copies_count({ count: tokens.length.toString() })}
          </span>
        </div>
        <div className="flex items-center gap-1 font-mono text-xxs tracking-[0.14em] uppercase">
          <SortButton
            active={sortKey === "serial"}
            dir={sortDir}
            onClick={() => toggleSort("serial")}
          >
            {m.detail_sort_serial()}
          </SortButton>
          <SortButton
            active={sortKey === "received"}
            dir={sortDir}
            onClick={() => toggleSort("received")}
          >
            {m.detail_sort_received()}
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
          />
        ))}
      </div>
    </div>
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
  if (key === "received") {
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
