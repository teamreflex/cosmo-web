"use client";

import { Dispatch, SetStateAction, memo, useState } from "react";
import { CollectionDataSource } from "@/hooks/use-filters";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import CosmoImage from "@/assets/cosmo.webp";
import PolygonImage from "@/assets/polygon.svg";
import Image from "next/image";
import { useSettingsStore } from "@/store";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { env } from "@/env.mjs";
import { CosmoFilters, SetCosmoFilters } from "@/hooks/use-cosmo-filters";

type Props = {
  filters: CosmoFilters;
  setFilters: SetCosmoFilters;
  dataSource: CollectionDataSource;
  setDataSource: Dispatch<SetStateAction<CollectionDataSource>>;
};

export default memo(function DataSourceSelector({
  filters,
  setFilters,
  dataSource,
  setDataSource,
}: Props) {
  const [open, setOpen] = useState(false);
  const warned = useSettingsStore((state) => state.warnings["data-source"]);
  const toggle = useSettingsStore((state) => state.toggleWarning);

  function warn() {
    if (warned === false) {
      setOpen(true);
    }
  }

  function close() {
    toggle("data-source");
    setOpen(false);
  }

  function update(val: string) {
    const source = val as CollectionDataSource;

    // reset any source-specific filters
    switch (source) {
      case "cosmo-legacy":
        // reset serial sort
        if (filters.sort === "serialAsc" || filters.sort === "serialDesc") {
          setFilters({
            sort: null,
          });
        }
        break;

      case "blockchain":
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
    <AlertDialog open={open} onOpenChange={setOpen}>
      <Select value={dataSource} onValueChange={update} onOpenChange={warn}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Data Source" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="cosmo-legacy">
            <div className="flex flex-row items-center gap-2">
              <Image
                src={CosmoImage.src}
                alt="Cosmo"
                width={24}
                height={24}
                className="rounded-full"
              />
              <span>Cosmo</span>
            </div>
          </SelectItem>
          <SelectItem value="blockchain">
            <div className="flex flex-row items-center gap-2">
              <div className="relative bg-polygon h-6 w-6 rounded-full">
                <Image
                  src={PolygonImage.src}
                  alt="Polygon"
                  fill={true}
                  className="p-1"
                />
              </div>
              <span>Polygon</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Objekt Data Source</AlertDialogTitle>
        </AlertDialogHeader>

        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
          <p>
            By default, {env.NEXT_PUBLIC_APP_NAME} will use COSMO to display
            your collection.
          </p>
          <p>This option allows you to use the Polygon blockchain instead.</p>
          <p>This does have its pros & cons:</p>
          <ul className="list-disc list-inside">
            <li>
              Sorting by serial is available, while sorting by gridable is
              unavailable.
            </li>
            <li>
              Any unsendable objekts will only be shown as non-transferable,
              rather than their real status like event reward, used for grid
              etc.
            </li>
            <li>
              Only minted objekts will be displayed, whereas the COSMO option
              will show any objekts that are pending mint.
            </li>
          </ul>
        </div>
        <AlertDialogFooter>
          <AlertDialogAction onClick={close}>Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
});
