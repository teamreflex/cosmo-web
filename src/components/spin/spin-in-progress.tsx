import { useObjektSpin, useSpinComplete } from "@/hooks/use-objekt-spin";
import { track } from "@/lib/utils";
import { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { match, P } from "ts-pattern";
import { Loader2 } from "lucide-react";
import { MissedObjekt, OptionObjekt } from "./state/spin-state-complete";
import { Button } from "../ui/button";
import { useQueryClient } from "@tanstack/react-query";

type Props = {
  inProgressSpinId?: number;
};

/**
 * Resume an in-progress objekt spin.
 */
export default function SpinInProgress(props: Props) {
  const queryClient = useQueryClient();
  const mutation = useSpinComplete();
  const stateStatus = useObjektSpin(useShallow((state) => state.state.status));
  const [open, setOpen] = useState(
    () => stateStatus === "idle" && props.inProgressSpinId !== undefined
  );
  const [index] = useState(() => Math.floor(Math.random() * 16));

  function completeSpin() {
    if (props.inProgressSpinId === undefined) return;

    mutation.mutate(
      {
        spinId: props.inProgressSpinId,
        index,
      },
      {
        onSuccess: () => {
          track("spin-objekt");
          queryClient.invalidateQueries({
            queryKey: ["spin-tickets"],
          });
        },
      }
    );
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resume Objekt Spin</DialogTitle>
          <DialogDescription>
            You have an objekt spin in progress!
          </DialogDescription>
        </DialogHeader>

        {match(mutation)
          .with({ status: "idle" }, () => (
            <div className="flex flex-col text-sm">
              <p>This will select a random objekt from the 16 available.</p>
              <p>Do you want to continue?</p>
            </div>
          ))
          .with({ status: "pending" }, () => (
            <div className="flex items-center justify-center">
              <Loader2 className="size-12 animate-spin" />
            </div>
          ))
          .with({ status: "success" }, ({ data }) => {
            const reward = data[index];
            return (
              <div className="flex flex-col gap-2 items-center w-2/3 mx-auto">
                <h3 className="text-lg font-bold">Spin Result</h3>

                {reward === null ? (
                  <MissedObjekt selected />
                ) : (
                  <OptionObjekt objekt={reward} selected />
                )}
              </div>
            );
          })
          .with({ status: "error" }, () => (
            <div className="flex flex-col text-sm">
              <p>An error occurred while selecting the objekt.</p>
              <p>Please try again.</p>
            </div>
          ))
          .exhaustive()}

        <DialogFooter className="gap-2">
          {match(mutation)
            .with({ status: P.union("idle", "pending") }, () => (
              <div className="contents">
                <Button
                  variant="secondary"
                  onClick={() => setOpen(false)}
                  disabled={mutation.status === "pending"}
                >
                  Cancel
                </Button>

                <Button
                  onClick={completeSpin}
                  disabled={mutation.status === "pending"}
                >
                  <span>Spin</span>
                  {mutation.status === "pending" && (
                    <Loader2 className="ml-2 animate-spin" />
                  )}
                </Button>
              </div>
            ))
            .with({ status: P.union("success", "error") }, () => (
              <Button onClick={() => setOpen(false)}>Close</Button>
            ))
            .exhaustive()}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
