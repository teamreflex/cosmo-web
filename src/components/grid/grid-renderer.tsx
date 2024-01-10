"use client";

import { CosmoGrid, CosmoOngoingGrid } from "@/lib/universal/cosmo/grid";
import { MemberFilterButton } from "../collection/member-filter";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { HeartCrack, Loader2 } from "lucide-react";
import GridEightSlot from "./grid-eight-slot";
import GridFourSlot from "./grid-four-slot";
import { ofetch } from "ofetch";

type Props = {
  grids: CosmoGrid[];
};

export default function GridRenderer({ grids }: Props) {
  const [selected, setSelected] = useState<CosmoGrid>();

  const { data, status, refetch, isRefetching } = useQuery({
    queryKey: ["grid", selected],
    queryFn: async () => {
      return await ofetch<CosmoOngoingGrid>(
        `/api/grid/v1/${selected?.id}/status`
      );
    },
    enabled: selected !== undefined,
    refetchOnWindowFocus: false,
  });

  return (
    <div className="w-full flex flex-col gap-6">
      {/* member selector */}
      <div className="flex flex-row gap-2 pt-1 pb-1 px-1 h-fit sm:justify-center justify-items-start overflow-x-scroll no-scrollbar">
        {grids.map((grid) => (
          <MemberFilterButton
            key={grid.member}
            name={grid.member}
            displayName={grid.member}
            image={grid.memberImage}
            isActive={selected?.member === grid.member}
            setActive={() => setSelected(grid)}
          />
        ))}
      </div>

      {/* state: unselected */}
      {selected === undefined && (
        <h3 className="text-center text-sm font-semibold">
          Select a member to view grid progress
        </h3>
      )}

      {(status === "pending" || isRefetching) && selected !== undefined ? (
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
                <span className="text-cosmo">
                  {data.ownedRewardObjektCount}
                </span>
                <span className="text-cosmo">{selected.member}</span>
                <span>Special Objekts</span>
              </div>

              {/* slots */}
              <div className="w-full" key={selected.id}>
                {data.ongoing.slotStatuses.length === 8 ? (
                  <GridEightSlot
                    slug={selected.id}
                    grid={data}
                    onComplete={() => refetch()}
                  />
                ) : (
                  <GridFourSlot
                    slug={selected.id}
                    grid={data}
                    onComplete={() => refetch()}
                  />
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
