"use client";

import { Button } from "../ui/button";
import { Loader2, RefreshCcw } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "../ui/use-toast";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { env } from "@/env.mjs";
import { refreshCosmoProfile } from "./actions";

export default function RefreshButton() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function update() {
    startTransition(async () => {
      await refreshCosmoProfile();

      toast({
        description: "COSMO profile refreshed.",
      });
      router.refresh();
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="profile" data-profile>
          <RefreshCcw className="h-5 w-5" />
          <span>Refresh</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Refresh COSMO Profile</DialogTitle>
          <DialogDescription>
            To minimize any impact on COSMO servers, {env.NEXT_PUBLIC_APP_NAME}{" "}
            does not update profile related data in real-time.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 text-sm">
          <p>Refreshing your profile will:</p>
          <ul className="list-disc list-inside ml-2">
            <li>Pull your latest account information from COSMO</li>
            <li>Update your ID if there&apos;s a mismatch</li>
            <li>Update your selected artist</li>
            <li>Update your profile images</li>
          </ul>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={update} disabled={isPending}>
            <span>Refresh</span>
            {isPending && <Loader2 className="ml-2 animate-spin" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
