"use client";

import { useEffect, useState } from "react";
import { useSettingsStore } from "@/store";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { env } from "@/env.mjs";
import Link from "next/link";
import { Github } from "lucide-react";

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
          <AlertDialogTitle>
            {env.NEXT_PUBLIC_APP_NAME} v{env.NEXT_PUBLIC_APP_VERSION}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="flex flex-col gap-2">
              <p>
                {env.NEXT_PUBLIC_APP_NAME} is a fan-made platform aiming to
                replicate the Cosmo mobile app with a desktop interface.
              </p>
              <p>
                It is not affiliated with Modhaus or its artists and is not
                endorsed by its developers.
              </p>
              <p>
                There will be instances where certain features are not perfectly
                replicated 1:1 with the mobile app, and cannot guarantee perfect
                functionality despite best efforts.
              </p>
              <p>Source code can be found below.</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="sm:justify-between">
          <AlertDialogCancel asChild>
            <Link
              href="https://github.com/teamreflex/cosmo-web"
              target="_blank"
            >
              <Github />
            </Link>
          </AlertDialogCancel>

          <div className="flex flex-col sm:flex-row gap-2">
            <AlertDialogCancel asChild>
              <Link
                href="https://www.youtube.com/watch?v=UDxID0_A9x4"
                target="_blank"
              >
                Cancel
              </Link>
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => setWarned(true)}>
              Continue
            </AlertDialogAction>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
