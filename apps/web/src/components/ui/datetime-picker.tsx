import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { IconCalendar, IconX } from "@tabler/icons-react";
import { format, setHours, setMinutes } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { useState } from "react";

type DateTimePickerProps = {
  value?: Date;
  onChange?: (date: Date | undefined | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  timezone?: string;
  side?: "top" | "right" | "bottom" | "left";
};

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Pick date and time",
  className,
  disabled,
  timezone = "Asia/Seoul",
  side,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);

  // Convert UTC value to zoned time for display/editing
  const zonedValue = value ? toZonedTime(value, timezone) : undefined;
  const timeValue = zonedValue ? format(zonedValue, "HH:mm") : "";

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
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            data-empty={!zonedValue}
            className="flex-2 justify-start text-left font-normal data-[empty=true]:text-muted-foreground"
          >
            <IconCalendar className="size-4" />
            {zonedValue ? (
              format(zonedValue, "PPP")
            ) : (
              <span>{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" side={side}>
          <Calendar
            mode="single"
            selected={zonedValue}
            defaultMonth={zonedValue}
            onSelect={handleDateSelect}
          />
        </PopoverContent>
      </Popover>

      <Input
        type="time"
        value={timeValue}
        onChange={handleTimeChange}
        disabled={disabled}
        className="flex-1"
      />

      <Button type="button" variant="outline" size="icon" onClick={handleReset}>
        <IconX />
      </Button>
    </div>
  );
}
