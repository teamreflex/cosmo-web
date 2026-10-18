import { m } from "@/i18n/messages";
import type { ValidOnlineType } from "@apollo/cosmo/types/common";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";

type Props = {
  value: ValidOnlineType | undefined;
  onChange: (value: ValidOnlineType | undefined) => void;
  className?: string;
};

type TypeValue = ValidOnlineType | "combined";

function typeItems() {
  return [
    { value: "combined", label: m.progress_filter_combined() },
    { value: "offline", label: m.filter_online_physical() },
    { value: "online", label: m.filter_online_digital() },
  ] satisfies { value: TypeValue; label: string }[];
}

/**
 * Switches between combined, physical and digital progress.
 */
export function ProgressTypeTabs(props: Props) {
  return (
    <Tabs
      className={props.className}
      value={props.value ?? "combined"}
      onValueChange={(value: TypeValue) =>
        props.onChange(value === "combined" ? undefined : value)
      }
    >
      <TabsList aria-label={m.progress_type()} className="w-full">
        {typeItems().map((item) => (
          <TabsTrigger key={item.value} value={item.value} className="px-3">
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

/**
 * The same choice as ProgressTypeTabs, as a dropdown.
 */
export function ProgressTypeSelect(props: Props) {
  const items = typeItems();

  return (
    <Select
      items={items}
      value={props.value ?? "combined"}
      onValueChange={(value) => {
        const item = items.find((i) => i.value === value);
        if (item !== undefined) {
          props.onChange(item.value === "combined" ? undefined : item.value);
        }
      }}
    >
      <SelectTrigger aria-label={m.progress_type()} className={props.className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
