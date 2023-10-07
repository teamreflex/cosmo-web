"use client";

import { CosmoGrid, CosmoOngoingGrid } from "@/lib/server/cosmo";
import { MemberFilterButton } from "../collection/member-filter";
import { useState } from "react";
import { useQuery } from "react-query";
import { HeartCrack, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import GridObjekt from "./grid-objekt";

type Props = {
  grids: CosmoGrid[];
};

export default function GridRenderer({ grids }: Props) {
  const [selected, setSelected] = useState<CosmoGrid>();

  const { data, status } = useQuery({
    queryKey: ["grid", selected?.id],
    queryFn: async () => {
      const response = await fetch(`/api/grid/v1/${selected?.id}/status`);
      if (!response.ok) {
        throw new Error("failed to fetch grid status");
      }
      return (await response.json()) as CosmoOngoingGrid;
    },
    enabled: selected !== undefined,
  });

  return (
    <div className="w-full flex flex-col gap-6">
      {/* member selector */}
      <div className="flex flex-row gap-2 pt-1 pb-1 px-1 h-fit sm:justify-center justify-items-start overflow-x-scroll no-scrollbar">
        {grids.map((grid) => (
          <MemberFilterButton
            key={grid.member}
            displayName={grid.member}
            image={grid.memberImage}
            isActive={selected?.member === grid.member}
            setActive={() => setSelected(grid)}
          />
        ))}
      </div>

      {/* state: unselected */}
      {selected === undefined && (
        <h3 className="text-center">Select a member to get started</h3>
      )}

      {status === "loading" ? (
        <div className="flex justify-center w-full">
          <Loader2 className="animate-spin w-12 h-12" />
        </div>
      ) : status === "error" ? (
        <div className="flex flex-col items-center w-full">
          <HeartCrack className="w-12 h-12" />
          <p className="text-sm">Error fetching grid for {selected?.member}</p>
        </div>
      ) : (
        <>
          {data !== undefined && selected !== undefined && (
            <div className="flex flex-col items-center w-full gap-6">
              {/* special objekt count */}
              <div className="inline-flex justify-center text-sm font-bold gap-1">
                <span>You have</span>
                <span className="text-cosmo">{selected.member}</span>
                <span>&apos;s</span>
                <span className="text-cosmo">
                  {data.ownedRewardObjektCount}
                </span>
                <span>Special Objekts</span>
              </div>

              {/* slots */}
              {data.ongoing.slotStatuses.length === 8 ? (
                <GridEightSlot grid={data} />
              ) : (
                <GridFourSlot grid={data} />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function GridEightSlot({ grid }: { grid: CosmoOngoingGrid }) {
  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-4 w-full md:w-2/3">
      <div className="aspect-photocard w-full flex justify-center items-center order-5">
        <p className="text-5xl">?</p>
      </div>
      {grid.ongoing.slotStatuses.map((slot, idx) => (
        <div
          className={cn(
            "relative aspect-photocard rounded-lg bg-accent w-full flex justify-center items-center",
            idx === 4 ? "order-6" : `order-${idx + 1}`
          )}
          key={slot.no}
        >
          {slot.preferredObjekt !== undefined ? (
            <GridObjekt
              image={slot.preferredObjekt.frontImage}
              collectionNo={slot.preferredObjekt.collectionNo}
              objektNo={slot.preferredObjekt.objektNo}
              textColor={slot.preferredObjekt.textColor}
            />
          ) : (
            <p className="text-white/20 text-3xl">{slot.no}</p>
          )}
        </div>
      ))}
    </div>
  );
}

const positions: Record<number, number> = {
  0: 2,
  1: 4,
  2: 6,
  3: 8,
};

function GridFourSlot({ grid }: { grid: CosmoOngoingGrid }) {
  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-4 w-full md:w-2/3">
      <div className="aspect-photocard bg-transparent w-full order-1" />
      <div className="aspect-photocard bg-transparent w-full order-3" />
      <div className="aspect-photocard bg-transparent w-full order-7" />
      <div className="aspect-photocard bg-transparent w-full order-9" />
      <div className="aspect-photocard w-full flex justify-center items-center order-5">
        <p className="text-5xl">?</p>
      </div>
      {grid.ongoing.slotStatuses.map((slot, idx) => (
        <div
          className={cn(
            "aspect-photocard rounded-lg bg-accent w-full flex justify-center items-center",
            `order-${positions[idx]}`
          )}
          key={slot.no}
        >
          {slot.preferredObjekt !== undefined ? (
            <Image
              src={slot.preferredObjekt.frontImage}
              fill={true}
              alt={slot.preferredObjekt.collectionId}
            />
          ) : (
            <p className="text-white/20 text-3xl">{slot.no}</p>
          )}
        </div>
      ))}
    </div>
  );
}
