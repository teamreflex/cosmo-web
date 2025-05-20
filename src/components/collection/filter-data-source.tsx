import type { CosmoFilters, SetCosmoFilters } from "@/hooks/use-cosmo-filters";
import type { CollectionDataSource } from "@/lib/utils";
import type { Dispatch, SetStateAction } from "react";
import { DataSourceSelector } from "./data-source-selector";

type Props = {
  filters: CosmoFilters;
  setFilters: SetCosmoFilters;
  dataSource: CollectionDataSource;
  setDataSource: Dispatch<SetStateAction<CollectionDataSource>>;
};

export default function FilterDataSource({
  filters,
  setFilters,
  dataSource,
  setDataSource,
}: Props) {
  function onChange(val: string) {
    const source = val as CollectionDataSource;

    switch (source) {
      /**
       * blockchain options don't support:
       * - gridable
       */
      case "blockchain":
      case "blockchain-groups":
        // reset gridable
        if (filters.gridable) {
          setFilters({
            gridable: null,
          });
        }
        break;
    }

    setDataSource(source);
  }

  return (
    <DataSourceSelector
      name="dataSource"
      value={dataSource}
      onValueChange={onChange}
    />
  );
}
