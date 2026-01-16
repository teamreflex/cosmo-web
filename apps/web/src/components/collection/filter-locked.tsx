import { Toggle } from "@/components/ui/toggle";
import { m } from "@/i18n/messages";

type Props = {
  showLocked: boolean;
  setShowLocked: (showLocked: boolean | undefined) => void;
};

export default function LockedFilter({ showLocked, setShowLocked }: Props) {
  const state = showLocked
    ? m.filter_locked_showing()
    : m.filter_locked_hiding();

  return (
    <Toggle
      variant="outline"
      className="w-36 data-[state=on]:border-cosmo"
      pressed={showLocked}
      onPressedChange={(v) => setShowLocked(v ? undefined : false)}
      aria-label={m.filter_toggle_locked()}
    >
      {state} {m.common_locked()}
    </Toggle>
  );
}
