import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  EventsFilters,
  SetEventsFilters,
} from "@/hooks/use-events-filters";
import { m } from "@/i18n/messages";

type Props = {
  sort: EventsFilters["sort"];
  onChange: SetEventsFilters;
};

export default function EventsSortFilter({ sort, onChange }: Props) {
  const value = sort ?? "newest";

  function handleChange(newValue: string) {
    onChange({
      sort: newValue === "newest" ? undefined : (newValue as "oldest"),
    });
  }

  return (
    <Select value={value} onValueChange={handleChange}>
      <SelectTrigger className="w-32">
        <SelectValue placeholder={m.filter_sort()}>
          {value === "newest" ? m.filter_sort_newest() : m.filter_sort_oldest()}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="newest">{m.filter_sort_newest()}</SelectItem>
        <SelectItem value="oldest">{m.filter_sort_oldest()}</SelectItem>
      </SelectContent>
    </Select>
  );
}
