"use client";

import { CosmoGrid, CosmoOngoingGrid } from "@/lib/universal/cosmo/grid";
import { MemberFilterButton } from "../collection/member-filter";
import { useQuery } from "@tanstack/react-query";
import { HeartCrack, Loader2 } from "lucide-react";
import GridEightSlot from "./grid-eight-slot";
import GridFourSlot from "./grid-four-slot";
import { ofetch } from "ofetch";
import { parseAsString, useQueryState } from "nuqs";

type Props = {
  edition: string;
  grids: CosmoGrid[];
};

export default function GridRenderer({ edition, grids }: Props) {
  const [member, setMember] = useQueryState("member", parseAsString);
  const selectedGrid = grids.find((g) => g.member === member);

  const { data, status, refetch, isRefetching } = useQuery({
    queryKey: ["grid", edition, member],
    queryFn: async () => {
      return await ofetch<CosmoOngoingGrid>(
        `/api/grid/v1/${selectedGrid?.id}/status`
      );
    },
    enabled: !!selectedGrid,
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
            isActive={selectedGrid?.member === grid.member}
            setActive={() => setMember(grid.member)}
          />
        ))}
      </div>

      {/* state: unselected */}
      {selectedGrid === undefined && (
        <h3 className="text-center text-sm font-semibold">
          Select a member to view grid progress
        </h3>
      )}

      {(status === "pending" || isRefetching) && selectedGrid !== undefined ? (
        <div className="flex justify-center w-full">
          <Loader2 className="animate-spin w-12 h-12" />
        </div>
      ) : status === "error" ? (
        <div className="flex flex-col items-center w-full">
          <HeartCrack className="w-12 h-12" />
          <p className="text-sm">
            Error fetching grid for {selectedGrid?.member}
          </p>
        </div>
      ) : (
        <>
          {data !== undefined && selectedGrid !== undefined && (
            <div className="flex flex-col items-center w-full gap-6">
              {/* special objekt count */}
              <div className="inline-flex justify-center text-sm font-bold gap-1">
                <span>You have</span>
                <span className="text-cosmo">
                  {data.ownedRewardObjektCount}
                </span>
                <span className="text-cosmo">{selectedGrid.member}</span>
                <span>Special Objekts</span>
              </div>

              {/* slots */}
              <div className="w-full" key={selectedGrid.id}>
                {data.ongoing.slotStatuses.length === 8 ? (
                  <GridEightSlot
                    slug={selectedGrid.id}
                    grid={data}
                    onRefresh={() => refetch()}
                  />
                ) : (
                  <GridFourSlot
                    slug={selectedGrid.id}
                    grid={data}
                    onRefresh={() => refetch()}
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
