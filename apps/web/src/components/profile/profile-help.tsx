import { AlertDialog } from "@/components/ui/alert-dialog";
import { useProfileHelp } from "@/hooks/use-profile-help";
import { useEffect, useState } from "react";
import type { PropsWithChildren } from "react";

/**
 * A profile tab's help dialog. It has no trigger of its own: the header's
 * actions menu opens it while the tab is mounted.
 */
export default function ProfileHelp({ children }: PropsWithChildren) {
  const { register } = useProfileHelp();
  const [open, setOpen] = useState(false);

  useEffect(() => register({ open: () => setOpen(true) }), [register]);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {children}
    </AlertDialog>
  );
}
