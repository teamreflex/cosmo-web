"use client";

import { Dispatch, SetStateAction, memo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import CosmoImage from "@/assets/cosmo.webp";
import PolygonImage from "@/assets/polygon.svg";
import Image from "next/image";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { env } from "@/env.mjs";
import { CosmoFilters, SetCosmoFilters } from "@/hooks/use-cosmo-filters";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import { CircleHelp } from "lucide-react";
import { Button } from "../ui/button";
import { CollectionDataSource } from "@/lib/utils";

type Props = {
  filters: CosmoFilters;
  setFilters: SetCosmoFilters;
  dataSource: CollectionDataSource;
  setDataSource: Dispatch<SetStateAction<CollectionDataSource>>;
  allowCosmoGroups?: boolean;
};

export default memo(function DataSourceSelector({
  filters,
  setFilters,
  dataSource,
  setDataSource,
  allowCosmoGroups = false,
}: Props) {
  const [open, setOpen] = useState(false);

  function onClose() {
    setOpen(false);
  }

  function update(val: string) {
    const source = val as CollectionDataSource;

    // reset any source-specific filters
    switch (source) {
      case "cosmo":
      // case "cosmo-legacy":
      //   // reset serial sort
      //   if (filters.sort === "serialAsc" || filters.sort === "serialDesc") {
      //     setFilters({
      //       sort: null,
      //     });
      //   }
      //   break;
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
      <Select value={dataSource} onValueChange={update}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Data Source" />
        </SelectTrigger>
        <SelectContent>
          {allowCosmoGroups && (
            <SelectItem value="cosmo">
              <div className="flex flex-row items-center gap-2">
                <Image
                  src={CosmoImage.src}
                  alt="COSMO"
                  width={24}
                  height={24}
                  className="rounded-full"
                />
                <span>Cosmo</span>
              </div>
            </SelectItem>
          )}
          {/* <SelectItem value="cosmo-legacy">
            <div className="flex flex-row items-center gap-2">
              <Image
                src={CosmoImage.src}
                alt="COSMO"
                width={24}
                height={24}
                className="rounded-full"
              />
              <span>{allowCosmoGroups ? "Legacy" : "Cosmo"}</span>
            </div>
          </SelectItem> */}
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

          <SelectSeparator />

          <Button
            className="rounded"
            variant="cosmo"
            size="sm"
            onClick={() => setOpen(true)}
          >
            <div className="flex flex-row items-center gap-2">
              <CircleHelp className="size-6" />
              <span>What is this?</span>
            </div>
          </Button>
        </SelectContent>
      </Select>

      <Content onClose={onClose} />
    </AlertDialog>
  );
});

function Content(props: { onClose: () => void }) {
  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Objekt Data Source</AlertDialogTitle>
        <AlertDialogDescription>
          {env.NEXT_PUBLIC_APP_NAME} can display collections in two different
          ways.
        </AlertDialogDescription>
      </AlertDialogHeader>

      <Accordion className="flex flex-col text-sm" type="single" collapsible>
        {sources.map((source, i) => (
          <AccordionItem key={i} value={source.value}>
            <AccordionTrigger className="py-2">{source.title}</AccordionTrigger>
            <AccordionContent className="flex flex-col gap-2">
              <p className="font-semibold">{source.description}</p>
              <ul className="list-disc list-inside">
                {source.notes.map((text, i) => (
                  <li key={i}>{text}</li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <AlertDialogFooter>
        <AlertDialogAction onClick={props.onClose}>Continue</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}

const sources = [
  {
    title: "COSMO",
    label: "COSMO",
    value: "cosmo",
    description: "Same as the collection tab in COSMO.",
    notes: [
      "Only available when signed in and viewing your own profile.",
      "Supports all the same filters and sorting methods as COSMO.",
      "Supports viewing different objekt statuses: event/welcome reward, gridded, mint pending, etc.",
    ],
  },
  {
    title: "Polygon Blockchain",
    label: "Polygon",
    value: "blockchain",
    description:
      "Displays all objekts, including duplicates, with filter limitations.",
    notes: [
      "Always available on any profile and is the only option available when not signed in, or viewing other profiles.",
      "Supports sorting by serial number.",
      "Does not support filtering by gridable.",
      "Objekt statuses such as event/welcome reward, gridded, mint pending, etc. are not supported.",
      "Transferable status is not reliable, as this information has stopped being published to the blockchain.",
    ],
  },
];
