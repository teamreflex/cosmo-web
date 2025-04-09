import { Toggle } from "@/components/ui/toggle";

type Props = {
  showLocked: boolean;
  setShowLocked: (showLocked: boolean | null) => void;
};

export default function LockedFilter({ showLocked, setShowLocked }: Props) {
  const state = showLocked ? "Showing" : "Hiding";

  return (
    <Toggle
      variant="outline"
      className="w-36 data-[state=on]:border-cosmo"
      pressed={showLocked}
      onPressedChange={(v) => setShowLocked(v ? null : false)}
      aria-label="Toggle locked"
    >
      {state} Locked
    </Toggle>
  );
}
