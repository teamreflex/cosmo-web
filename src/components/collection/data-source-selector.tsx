"use client";

import { Dispatch, SetStateAction, memo, useState } from "react";
import { CollectionDataSource } from "@/hooks/use-cosmo-filters";
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

type Props = {
  dataSource: CollectionDataSource;
  setDataSource: Dispatch<SetStateAction<CollectionDataSource>>;
};

export default memo(function DataSourceSelector({
  dataSource,
  setDataSource,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Select
      value={dataSource}
      onValueChange={(val) => setDataSource(val as CollectionDataSource)}
    >
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
  );
});
