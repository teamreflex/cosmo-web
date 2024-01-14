"use client";

import { Dispatch, Fragment, SetStateAction, memo, useState } from "react";
import {
  CollectionDataSource,
  PropsWithFilters,
} from "@/hooks/use-cosmo-filters";
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
import { ValidSorts } from "@/lib/universal/cosmo/common";

type Props = PropsWithFilters<"sort"> & {
  dataSource: CollectionDataSource;
  setDataSource: Dispatch<SetStateAction<CollectionDataSource>>;
};

export default memo(function DataSourceSelector({
  filters,
  setFilters,
  dataSource,
  setDataSource,
}: Props) {
  const [openWarning, setOpenWarning] = useState(false);
  const warned = useSettingsStore((state) => state.warnings["data-source"]);
  const toggle = useSettingsStore((state) => state.toggleWarning);

  function warn() {
    if (warned === false) {
      setOpenWarning(true);
    }
  }

  function close() {
    toggle("data-source");
    setOpenWarning(false);
  }

  function update(val: string) {
    const source = val as CollectionDataSource;
    // if switching to cosmo and using serial sort, reset sort
    if (
      source === "cosmo" &&
      (filters === ValidSorts.SERIAL_ASCENDING ||
        filters === ValidSorts.SERIAL_DESCENDING)
    ) {
      setFilters("sort", null);
    }
    setDataSource(source);
  }

  return (
    <Fragment>
      <AlertDialog open={openWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Objekt Data Source</AlertDialogTitle>
          </AlertDialogHeader>

          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>
              By default, {env.NEXT_PUBLIC_APP_NAME} will use Cosmo to display
              your collection.
            </p>
            <p>This option allows you to use the Polygon blockchain instead.</p>
            <p>This does have its pros & cons:</p>
            <ul className="list-disc list-inside">
              <li>
                Additional filters are available, such as sorting by serial.
              </li>
              <li>
                Transferable and grid status indicators are not perfect.
                Sometimes objekts used in grids will show as event rewards, and
                vice versa.
              </li>
              <li>
                Only minted objekts will be displayed, whereas the Cosmo option
                will show any objekts that are pending mint.
              </li>
              <li>Lenticular indicators are not available.</li>
            </ul>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={close}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Select value={dataSource} onValueChange={update} onOpenChange={warn}>
        <SelectTrigger className="w-36 drop-shadow-lg">
          <SelectValue placeholder="Data Source" />
        </SelectTrigger>
        <SelectContent
          ref={(ref) => {
            // fixes mobile touch-through bug in radix
            if (!ref) return;
            ref.ontouchstart = (e) => {
              e.preventDefault();
            };
          }}
        >
          <SelectItem value="cosmo">
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
              <Image
                src={PolygonImage.src}
                alt="Polygon"
                width={24}
                height={24}
                className="rounded-full"
              />
              <span>Polygon</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </Fragment>
  );
});
