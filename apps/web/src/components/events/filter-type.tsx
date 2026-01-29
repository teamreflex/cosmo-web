import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  EventsFilters,
  SetEventsFilters,
} from "@/hooks/use-events-filters";
import { m } from "@/i18n/messages";
import { cn } from "@/lib/utils";
import { eventTypes, type EventTypeKey } from "@apollo/database/web/types";
import {
  IconCalendar,
  IconChevronDown,
  IconDisc,
  IconHeartHandshake,
  IconMapPin,
  IconPackage,
  IconPlane,
  IconShoppingBag,
  IconSparkles,
} from "@tabler/icons-react";
import { useState } from "react";

const eventTypeIcons: Record<EventTypeKey, React.ElementType> = {
  seasonal: IconCalendar,
  album: IconDisc,
  merch: IconPackage,
  offline: IconMapPin,
  shop: IconShoppingBag,
  collaboration: IconHeartHandshake,
  promotional: IconSparkles,
  tour: IconPlane,
};

type Props = {
  type: EventsFilters["type"];
  onChange: SetEventsFilters;
};

const eventTypeList = Object.values(eventTypes);

export default function EventsTypeFilter({ type, onChange }: Props) {
  const [open, setOpen] = useState(false);

  function handleChange(eventType: EventTypeKey, checked: boolean) {
    onChange({
      type: checked ? eventType : undefined,
    });
  }

  const selectedType = type ? eventTypes[type] : undefined;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "flex items-center justify-between gap-2 w-32",
            type && "border-cosmo dark:border-cosmo",
          )}
        >
          <span>{selectedType?.label ?? m.common_type()}</span>
          <IconChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-fit" align="end">
        {eventTypeList.map((eventType) => {
          const Icon = eventTypeIcons[eventType.value];
          return (
            <DropdownMenuCheckboxItem
              key={eventType.value}
              checked={type === eventType.value}
              onCheckedChange={(checked) =>
                handleChange(eventType.value, checked)
              }
            >
              <Icon className="size-4" />
              {eventType.label}
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
