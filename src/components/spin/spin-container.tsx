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

type Props = {
  currentUser: PublicProfile;
};

export default function SpinContainer({ currentUser }: Props) {
  const state = useObjektSpin((state) => state.state);

  return (
    <div className="flex flex-col gap-4">
      <SpinStepper />

      {match(state)
        .with({ status: "idle" }, () => <StateIdle />)
        .with({ status: "selecting" }, () => (
          <StateSelecting currentUser={currentUser} />
        ))
        .with({ status: "selected" }, (state) => (
          <StateSelected state={state} />
        ))
        .with({ status: "created" }, (state) => <StateCreated state={state} />)
        .with({ status: "sending" }, (state) => <StatePending state={state} />)
        .with({ status: "success" }, (state) => <StateSuccess state={state} />)
        .with({ status: "error" }, (state) => <StateError state={state} />)
        .with({ status: "confirmed" }, (state) => (
          <StateConfirmed state={state} />
        ))
        .with({ status: "complete" }, (state) => (
          <StateComplete state={state} />
        ))
        .exhaustive()}
    </div>
  );
}
