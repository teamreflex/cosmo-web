"use client";

import { useEffect, useState } from "react";
import { useSettingsStore } from "@/store";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
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
        </AlertDialogHeader>

        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          <p>
            {env.NEXT_PUBLIC_APP_NAME} is an unofficial desktop client for{" "}
            <span className="italic">Cosmo: the Gate</span>.
          </p>
          <p>
            Features such as sending objekts, gridding objekts, wishlist
            building and viewing gravities requires signing in via the Cosmo
            Ramper integration. This requires cookies to function.
          </p>
          <p>
            Viewing user profiles (collections, trades, wishlists etc){" "}
            <span className="font-bold">does not require logging in</span>.
          </p>
          <p>Some features do not work on mobile, such as sending objekts.</p>
          <p>
            {env.NEXT_PUBLIC_APP_NAME} is not affiliated with, endorsed by or
            supported by Modhaus or its artists.{" "}
          </p>
        </div>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => setWarned(true)}>
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
