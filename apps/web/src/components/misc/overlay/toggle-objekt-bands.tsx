import { Button } from "@/components/ui/button";
import { useObjektBands } from "@/hooks/use-objekt-bands";
import {
  IconLayoutSidebarRight,
  IconLayoutSidebarRightFilled,
} from "@tabler/icons-react";

export default function ToggleObjektBands() {
  const { hidden, toggleHidden } = useObjektBands();

  const Icon = hidden ? IconLayoutSidebarRight : IconLayoutSidebarRightFilled;

  return (
    <Button size="icon-lg" onClick={toggleHidden}>
      <Icon className="size-6" />
    </Button>
  );
}
