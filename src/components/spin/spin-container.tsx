"use client";

import { PublicProfile } from "@/lib/universal/cosmo/auth";
import { match } from "ts-pattern";
import SpinStepper from "./spin-stepper";
import { useObjektSpin } from "@/hooks/use-objekt-spin";
import StateIdle from "./state/spin-state-idle";
import StateSelecting from "./state/spin-state-selecting";
import StateSelected from "./state/spin-state-selected";
import StateCreated from "./state/spin-state-created";
import StatePending from "./state/spin-state-pending";
import StateSuccess from "./state/spin-state-success";
import StateError from "./state/spin-state-error";
import StateConfirmed from "./state/spin-state-confirmed";
import StateComplete from "./state/spin-state-complete";
import { CosmoSeason } from "@/lib/universal/cosmo/season";
import { Suspense, useEffect } from "react";
import Skeleton from "../skeleton/skeleton";
import { useUserState } from "@/hooks/use-user-state";

type Props = {
  seasons: CosmoSeason[];
  currentUser: PublicProfile;
};

export default function SpinContainer({ seasons, currentUser }: Props) {
  const { artist } = useUserState();
  const state = useObjektSpin((state) => state.state);
  const resetState = useObjektSpin((state) => state.resetState);

  // reset the state when the artist changes
  useEffect(() => {
    resetState();
  }, [resetState, artist]);

  return (
    <div className="flex flex-col gap-4">
      <SpinStepper />

      <Suspense
        fallback={
          <div className="flex flex-col">
            <div className="flex flex-col gap-4 items-center justify-center mx-auto w-full">
              <Skeleton className="flex items-center justify-center rounded-2xl md:rounded-lg aspect-photocard w-2/3 md:w-48" />
            </div>
          </div>
        }
      >
        {match(state)
          .with({ status: "idle" }, () => <StateIdle />)
          .with({ status: "selecting" }, () => (
            <StateSelecting currentUser={currentUser} />
          ))
          .with({ status: "selected" }, (state) => (
            <StateSelected seasons={seasons} state={state} />
          ))
          .with({ status: "created" }, (state) => (
            <StateCreated state={state} />
          ))
          .with({ status: "sending" }, (state) => (
            <StatePending state={state} />
          ))
          .with({ status: "success" }, (state) => (
            <StateSuccess state={state} />
          ))
          .with({ status: "error" }, (state) => <StateError state={state} />)
          .with({ status: "confirmed" }, (state) => (
            <StateConfirmed state={state} />
          ))
          .with({ status: "complete" }, (state) => (
            <StateComplete state={state} />
          ))
          .exhaustive()}
      </Suspense>
    </div>
  );
}
