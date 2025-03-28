"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CosmoGridRewardClaimResult } from "@/lib/universal/cosmo/grid";
import GridObjekt from "./grid-objekt";
import { Button } from "../ui/button";

type Props = {
  reward: CosmoGridRewardClaimResult | undefined;
  onComplete: () => void;
};

export default function RewardDialog({ reward, onComplete }: Props) {
  return (
    <Dialog open={reward !== undefined}>
      {reward?.objekt && (
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Special Objekt is here!</DialogTitle>
            <DialogDescription>
              You get {reward.objekt.comoAmount} COMO every month
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2 items-center justify-center w-full">
            <GridObjekt
              className="w-2/3"
              image={reward.objekt.frontImage}
              collectionNo={reward.objekt.collectionNo}
              objektNo={reward.objekt.objektNo}
              textColor={reward.objekt.textColor}
              selected={false}
            />

            <Button variant="cosmo" onClick={onComplete}>
              Continue
            </Button>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
