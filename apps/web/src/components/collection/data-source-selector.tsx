import { m } from "@/i18n/messages";
import type { CollectionDataSource } from "@apollo/util";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { getSources } from "./data-sources";

type Props = {
  name: string;
  value?: CollectionDataSource;
  defaultValue?: CollectionDataSource;
  onValueChange?: (value: CollectionDataSource) => void;
  targetCosmo?: string;
};

export function DataSourceSelector(props: Props) {
  const sources = getSources();

  return (
    <Select
      name={props.name}
      value={props.value}
      defaultValue={props.defaultValue}
      onValueChange={(value) => {
        if (value !== null) props.onValueChange?.(value);
      }}
    >
      <SelectTrigger className="w-36 **:data-icon:size-5">
        <SelectValue>
          {(value: CollectionDataSource | null) => {
            const source = sources.find((source) => source.value === value);
            return source ? (
              <div className="flex flex-row items-center gap-2">
                {source.icon}
                <span>{source.shortLabel}</span>
              </div>
            ) : (
              m.data_source_title()
            );
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="end" className="w-auto min-w-(--anchor-width)">
        {sources
          .filter((source) => source.isAvailable(props.targetCosmo))
          .map((source) => (
            <SelectItem
              key={source.value}
              value={source.value}
              className="**:data-icon:size-8"
            >
              <div className="flex flex-row items-center gap-2">
                {source.icon}
                <div className="flex flex-col">
                  <span>{source.label}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {source.subtitle}
                  </span>
                </div>
              </div>
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}
