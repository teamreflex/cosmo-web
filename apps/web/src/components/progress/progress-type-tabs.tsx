import { m } from "@/i18n/messages";
import type { ValidOnlineType } from "@apollo/cosmo/types/common";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";

type Props = {
  value: ValidOnlineType | undefined;
  onChange: (value: ValidOnlineType | undefined) => void;
  className?: string;
};

/**
 * Switches between combined, physical and digital progress.
 */
export default function ProgressTypeTabs(props: Props) {
  const items = [
    { value: "combined", label: m.progress_filter_combined() },
    { value: "offline", label: m.filter_online_physical() },
    { value: "online", label: m.filter_online_digital() },
  ] satisfies { value: ValidOnlineType | "combined"; label: string }[];

  return (
    <Tabs
      className={props.className}
      value={props.value ?? "combined"}
      onValueChange={(value: ValidOnlineType | "combined") =>
        props.onChange(value === "combined" ? undefined : value)
      }
    >
      <TabsList aria-label={m.progress_type()} className="w-full">
        {items.map((item) => (
          <TabsTrigger key={item.value} value={item.value} className="px-3">
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
