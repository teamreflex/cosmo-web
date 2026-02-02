import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { IconCalendar, IconClock, IconX } from "@tabler/icons-react";
import { format, isValid, parse, setHours, setMinutes } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { useState } from "react";

type DateTimePickerProps = {
  value?: Date;
  onChange?: (date: Date | undefined | null) => void;
  className?: string;
  disabled?: boolean;
  timezone?: string;
  side?: "top" | "right" | "bottom" | "left";
};

export function DateTimePicker({
  value,
  onChange,
  className,
  disabled,
  timezone = "Asia/Seoul",
  side,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);

  // Convert UTC value to zoned time for display/editing
  const zonedValue = value ? toZonedTime(value, timezone) : undefined;
  const dateValue = zonedValue ? format(zonedValue, "yyyy-MM-dd") : "";
  const timeValue = zonedValue ? format(zonedValue, "HH:mm") : "";

  function handleDateInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const dateString = e.target.value;
    if (!dateString) return;
    const parsed = parse(dateString, "yyyy-MM-dd", new Date());
    if (!isValid(parsed)) return;
    const hours = zonedValue ? zonedValue.getHours() : 0;
    const minutes = zonedValue ? zonedValue.getMinutes() : 0;
    const newDate = setMinutes(setHours(parsed, hours), minutes);
    onChange?.(fromZonedTime(newDate, timezone));
  }

  // Handle date selection from calendar
  function handleDateSelect(date: Date | undefined) {
    if (!date) {
      onChange?.(undefined);
      return;
    }
    // Preserve existing time if we have one
    const hours = zonedValue ? zonedValue.getHours() : 0;
    const minutes = zonedValue ? zonedValue.getMinutes() : 0;
    const newDate = setMinutes(setHours(date, hours), minutes);
    // Convert back to UTC
    onChange?.(fromZonedTime(newDate, timezone));
    setOpen(false);
  }

  // Handle time input change
  function handleTimeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const timeString = e.target.value;
    if (!timeString) return;

    const parts = timeString.split(":").map(Number);
    const hours = parts[0];
    const minutes = parts[1];
    if (hours === undefined || minutes === undefined) return;
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return;

    // If no date yet, use today
    const baseDate = zonedValue ?? new Date();
    const newDate = setMinutes(setHours(baseDate, hours), minutes);
    onChange?.(fromZonedTime(newDate, timezone));
  }

  function handleReset() {
    onChange?.(null);
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div className="relative flex-2">
            <Input
              type="date"
              value={dateValue}
              onChange={handleDateInputChange}
              disabled={disabled}
              className="pr-9 [&::-webkit-calendar-picker-indicator]:hidden"
            />
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={disabled}
                className="absolute right-1 top-1/2 -translate-y-1/2"
              >
                <IconCalendar className="size-4" />
              </Button>
            </PopoverTrigger>
          </div>
        </PopoverAnchor>
        <PopoverContent className="w-auto p-0" side={side}>
          <Calendar
            mode="single"
            selected={zonedValue}
            defaultMonth={zonedValue}
            onSelect={handleDateSelect}
          />
        </PopoverContent>
      </Popover>

      <div className="relative flex-1">
        <Input
          type="time"
          value={timeValue}
          onChange={handleTimeChange}
          disabled={disabled}
          className="pr-9 [&::-webkit-calendar-picker-indicator]:hidden"
        />
        <IconClock className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2" />
      </div>

      <Button type="button" variant="outline" size="icon" onClick={handleReset}>
        <IconX />
      </Button>
    </div>
  );
}
