import { useObjektSpin } from "@/hooks/use-objekt-spin";
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
import { Button } from "../ui/button";

type Props = {
  inProgressSpinId?: number;
};

/**
 * Resume an in-progress objekt spin.
 */
export default function SpinInProgress(props: Props) {
  const state = useObjektSpin(useShallow((state) => state.state));
  const resumeSpin = useObjektSpin((state) => state.resumeSpin);
  const [open, setOpen] = useState(
    () => state.status === "idle" && props.inProgressSpinId !== undefined
  );

  function resume() {
    if (props.inProgressSpinId === undefined) return;
    resumeSpin(props.inProgressSpinId);
    setOpen(false);
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

        <p>Do you want to resume the spin?</p>

        <DialogFooter className="gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>

          <Button onClick={resume}>Resume</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
