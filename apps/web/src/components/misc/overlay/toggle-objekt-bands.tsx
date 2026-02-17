import { Button } from "@/components/ui/button";
import { useObjektBands } from "@/hooks/use-objekt-bands";
import { m } from "@/i18n/messages";
import {
  IconLayoutSidebarRight,
  IconLayoutSidebarRightFilled,
} from "@tabler/icons-react";

export default function ToggleObjektBands() {
  const { hidden, toggleHidden } = useObjektBands();

  const Icon = hidden ? IconLayoutSidebarRight : IconLayoutSidebarRightFilled;

  return (
    <Button
      size="icon-lg"
      onClick={toggleHidden}
      aria-label={m.aria_toggle_objekt_bands()}
    >
      <Icon className="size-6" />
    </Button>
  );
}
