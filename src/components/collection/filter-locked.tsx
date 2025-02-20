"use client";

import { Toggle } from "@/components/ui/toggle";

type Props = {
  showLocked: boolean;
  setShowLocked: (showLocked: boolean | null) => void;
};

export default function LockedFilter({ showLocked, setShowLocked }: Props) {
  const state = showLocked ? "Showing" : "Hiding";

  return (
    <Toggle
      className="w-36"
      variant="cosmo"
      pressed={showLocked}
      onPressedChange={(v) => setShowLocked(v ? null : false)}
      aria-label="Toggle locked"
    >
      {state} Locked
    </Toggle>
  );
}
