"use client";

import { Toggle } from "@/components/ui/toggle";

type Props = {
  showLocked: boolean;
  setShowLocked: (showLocked: boolean) => void;
};

export function LockedFilter({ showLocked, setShowLocked }: Props) {
  return (
    <Toggle
      className="drop-shadow-lg w-36"
      variant="cosmo"
      pressed={showLocked}
      onPressedChange={setShowLocked}
      aria-label="Toggle locked"
    >
      {showLocked ? "Showing" : "Hiding"} Locked
    </Toggle>
  );
}
