"use client";

import { useEffect, useState } from "react";
import { useSettingsStore } from "@/store";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { env } from "@/env.mjs";

export default function WarningDialog() {
  const warned = useSettingsStore((state) => state.warned);
  const setWarned = useSettingsStore((state) => state.setWarned);

  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(warned === false);
  }, [warned]);

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{env.NEXT_PUBLIC_APP_NAME}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="flex flex-col gap-2">
              <p>
                {env.NEXT_PUBLIC_APP_NAME} is an unofficial desktop client for{" "}
                <span className="italic">Cosmo: the Gate</span>.
              </p>
              <p>
                Features such as sending objekts, grids, wishlist building and
                viewing gravities requires signing in via the Cosmo Ramper
                integration. This requires cookies to function.
              </p>
              <p>
                {env.NEXT_PUBLIC_APP_NAME} is not affiliated with, endorsed by
                or supported by Modhaus or its artists.{" "}
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => setWarned(true)}>
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
