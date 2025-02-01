"use client";

import { CloudAlert, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { env } from "@/env";
import { refreshCosmoProfile } from "@/components/profile/actions";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function StateMissingProfile() {
  const [open, setOpen] = useState(true);
  const [isPending, startTransition] = useTransition();

  function update() {
    startTransition(async () => {
      await refreshCosmoProfile();
      window.location.reload();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <DialogTrigger asChild>
            <TooltipTrigger asChild>
              <div className="relative flex justify-center items-center py-1 px-2 rounded-xl bg-cosmo-text/25 hover:bg-cosmo-text/40 transition-colors">
                <CloudAlert className="text-cosmo-text w-6 h-6" />
              </div>
            </TooltipTrigger>
          </DialogTrigger>
          <TooltipContent side="bottom" align="end">
            COSMO profile is unsynced
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>COSMO profile is unsynced</DialogTitle>
          <DialogDescription>
            Your {env.NEXT_PUBLIC_APP_NAME} profile is currently out of sync
            with COSMO.
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm">
          This can happen when your COSMO ID changes. Tapping the refresh button
          will sync your profile from COSMO and dismiss this message.
        </p>

        <DialogFooter className="gap-2">
          <Button onClick={update} disabled={isPending}>
            <span>Refresh</span>
            {isPending && <Loader2 className="ml-2 animate-spin" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
