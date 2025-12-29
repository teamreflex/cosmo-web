import { Badge } from "@/components/ui/badge";
import { eventTypes } from "@apollo/database/web/types";
import type { EventTypeKey } from "@apollo/database/web/types";
import {
  IconDisc,
  IconHeartHandshake,
  IconMapPin,
  IconPlane,
  IconShoppingBag,
  IconSparkles,
} from "@tabler/icons-react";

type EventTypeBadgeProps = {
  eventType: EventTypeKey;
  className?: string;
};

const eventTypeIcons = {
  album: IconDisc,
  offline: IconMapPin,
  shop: IconShoppingBag,
  collaboration: IconHeartHandshake,
  promotional: IconSparkles,
  tour: IconPlane,
} as const;

export default function EventTypeBadge({
  eventType,
  className,
}: EventTypeBadgeProps) {
  const Icon = eventTypeIcons[eventType];
  const label = eventTypes[eventType].label;

  return (
    <Badge variant="secondary" className={className}>
      <Icon className="size-4" />
      <span>{label}</span>
    </Badge>
  );
}
