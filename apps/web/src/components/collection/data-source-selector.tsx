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
      onValueChange={props.onValueChange}
    >
      <SelectTrigger className="w-36 **:data-desc:hidden **:data-icon:size-5 **:data-label:hidden">
        <SelectValue placeholder={m.data_source_title()} />
      </SelectTrigger>
      <SelectContent
        align="end"
        className="[&_*[role=option]]:ps-2 [&_*[role=option]]:pe-8 [&_*[role=option]>span]:start-auto [&_*[role=option]>span]:end-2"
      >
        {sources
          .filter((source) => source.isAvailable(props.targetCosmo))
          .map((source) => (
            <SelectItem
              key={source.value}
              value={source.value}
              className="**:data-icon:size-8 **:data-short-label:hidden"
            >
              <div className="flex flex-row items-center gap-2">
                {source.icon}
                <div className="flex flex-col">
                  <span data-label>{source.label}</span>
                  <span data-short-label>{source.shortLabel}</span>
                  <span
                    className="mt-1 block text-xs text-muted-foreground"
                    data-desc
                  >
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
