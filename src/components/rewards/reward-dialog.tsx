"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ReactNode, useState, useTransition } from "react";
import { Button } from "../ui/button";
import { useToast } from "../ui/use-toast";
import { submitEventRewards } from "./actions";
import { trackEvent } from "fathom-client";
import { useRouter } from "next/navigation";

type Props = {
  availableForClaim: number;
  trigger: ReactNode;
  content: ReactNode;
};

export default function RewardDialog({
  availableForClaim,
  trigger,
  content,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  function claim() {
    startTransition(async () => {
      const result = await submitEventRewards();

      switch (result.status) {
        case "error":
          toast({
            variant: "destructive",
            description: result.error,
          });
          break;
        case "success":
          trackEvent("reward-claim");
          toast({
            title: "Reward claimed!",
            description: "Objekts will be available soon.",
          });
          router.refresh();
          setOpen(false);
          break;
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Objekt Reward</DialogTitle>
          <DialogDescription>
            You can only receive objekts during the event reward period.
          </DialogDescription>
        </DialogHeader>

        {content}

        <DialogFooter>
          <Button
            className="w-full"
            variant="cosmo"
            disabled={availableForClaim === 0 || isPending}
            onClick={claim}
          >
            Receive All
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
