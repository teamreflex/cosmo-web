import { m } from "@/i18n/messages";
import { Badge } from "../ui/badge";

type Props = {
  type: "event-gravity" | "grand-gravity";
};

export default function GravityTypeBadge({ type }: Props) {
  if (type === "event-gravity") {
    return <Badge variant="event-gravity">{m.gravity_badge_event()}</Badge>;
  }
  if (type === "grand-gravity") {
    return <Badge variant="grand-gravity">{m.gravity_badge_grand()}</Badge>;
  }
  return null;
}
