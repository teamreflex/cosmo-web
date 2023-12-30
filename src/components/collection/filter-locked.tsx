"use client";

import { Toggle } from "@/components/ui/toggle";
import { memo } from "react";

type Props = {
  showLocked: boolean;
  setShowLocked: (showLocked: boolean | null) => void;
};

export default memo(function LockedFilter({
  showLocked,
  setShowLocked,
}: Props) {
  return (
    <Toggle
      className="drop-shadow-lg w-36"
      variant="cosmo"
      pressed={showLocked}
      onPressedChange={(v) => setShowLocked(v ? null : false)}
      aria-label="Toggle locked"
    >
      {showLocked ? "Showing" : "Hiding"} Locked
    </Toggle>
  );
});
