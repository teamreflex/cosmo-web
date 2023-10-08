"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CosmoGridRewardClaimResult } from "@/lib/server/cosmo";
import { useEffect, useState } from "react";
import GridObjekt from "./grid-objekt";
import { Button } from "../ui/button";

type Props = {
  reward: CosmoGridRewardClaimResult | undefined;
};

export default function RewardDialog({ reward }: Props) {
  const [open, setOpen] = useState(false);

  // pop the dialog upon reward coming in
  useEffect(() => {
    if (reward?.objekt) {
      setOpen(true);
    }
  }, [reward]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {reward?.objekt && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Special Objekt is here!</DialogTitle>
            <DialogDescription>
              You can get {reward.objekt.comoAmount} COMO every month
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2 items-center justify-center w-2/3">
            <GridObjekt
              image={reward.objekt.frontImage}
              collectionNo={reward.objekt.collectionNo}
              objektNo={reward.objekt.objektNo}
              textColor={reward.objekt.textColor}
              selected={false}
            />

            <Button variant="cosmo" onClick={() => setOpen(false)}>
              Check
            </Button>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
