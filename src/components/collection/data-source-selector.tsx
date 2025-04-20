"use client";

import { ReactNode, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import CosmoImage from "@/assets/cosmo.webp";
import AbstractImage from "@/assets/abstract.svg";
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
import { env } from "@/env";
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
  name: string;
  value?: CollectionDataSource;
  defaultValue?: CollectionDataSource;
  onValueChange?: (value: CollectionDataSource) => void;
  allowCosmo: boolean;
};

export function DataSourceSelector(props: Props) {
  const [helpOpen, setHelpOpen] = useState(false);

  function onHelpClose() {
    setHelpOpen(false);
  }

  return (
    <AlertDialog open={helpOpen} onOpenChange={setHelpOpen}>
      <Select
        name={props.name}
        value={props.value}
        defaultValue={props.defaultValue}
        onValueChange={props.onValueChange}
      >
        <SelectTrigger className="w-36 **:data-desc:hidden **:data-label:hidden **:data-icon:size-5">
          <SelectValue placeholder="Data Source" />
        </SelectTrigger>
        <SelectContent
          align="end"
          className="[&_*[role=option]]:ps-2 [&_*[role=option]]:pe-8 [&_*[role=option]>span]:start-auto [&_*[role=option]>span]:end-2"
        >
          {sources
            .filter((source) => !(source.requiresAuth && !props.allowCosmo))
            .map((source) => (
              <SelectItem
                key={source.value}
                value={source.value}
                className="**:data-short-label:hidden **:data-icon:size-8"
              >
                <div className="flex flex-row items-center gap-2">
                  {source.icon}
                  <div className="flex flex-col">
                    <span data-label>{source.label}</span>
                    <span data-short-label>{source.shortLabel}</span>
                    <span
                      className="text-muted-foreground mt-1 block text-xs"
                      data-desc
                    >
                      {source.subtitle}
                    </span>
                  </div>
                </div>
              </SelectItem>
            ))}

          <SelectSeparator />

          <div className="flex w-full justify-center">
            <Button variant="link" size="xs" onClick={() => setHelpOpen(true)}>
              <div className="flex flex-row items-center gap-2 text-xs">
                <CircleHelp className="size-4" />
                <span>What is this?</span>
              </div>
            </Button>
          </div>
        </SelectContent>
      </Select>
      <Content onClose={onHelpClose} />
    </AlertDialog>
  );
}

function Content(props: { onClose: () => void }) {
  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Objekt Data Source</AlertDialogTitle>
        <AlertDialogDescription>
          {env.NEXT_PUBLIC_APP_NAME} can display collections in different ways.
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

type Source = {
  title: string;
  subtitle: string;
  label: string;
  shortLabel: string;
  icon: ReactNode;
  value: CollectionDataSource;
  description: string;
  notes: string[];
  requiresAuth: boolean;
};

const sources: Source[] = [
  {
    title: "COSMO - Collection Groups",
    subtitle: "Collection groups from COSMO",
    label: "COSMO - Collection Groups",
    shortLabel: "COSMO",
    icon: <CosmoIcon />,
    value: "cosmo",
    description: "Same as the collection tab in COSMO.",
    notes: [
      "Only available when signed in and viewing your own profile.",
      "Supports all the same filters and sorting methods as COSMO.",
      "Supports viewing different objekt statuses: event/welcome reward, gridded, mint pending, etc.",
    ],
    requiresAuth: true,
  },
  {
    title: "Abstract Blockchain - Collection Groups",
    subtitle: "Collection groups with extra filters",
    label: "Abstract - Collection Groups",
    shortLabel: "Groups",
    icon: <AbstractIcon />,
    value: "blockchain-groups",
    description:
      "Replicates COSMO collection groups but doesn't require signing in.",
    notes: [
      "Always available on any profile.",
      "Supports sorting by serial number.",
      "Does not support filtering by gridable.",
      "Objekt statuses such as event/welcome reward, gridded, mint pending, etc. are not supported.",
      "Transferable status may not be reliable.",
    ],
    requiresAuth: false,
  },
  {
    title: "Abstract Blockchain - All Objekts",
    subtitle: "View all individual objekts",
    label: "Abstract - All Objekts",
    shortLabel: "Abstract",
    icon: <AbstractIcon />,
    value: "blockchain",
    description:
      "Displays all objekts, including duplicates, with filter limitations.",
    notes: [
      "The same viewing format as COSMO prior to its collection groups update.",
      "Has the same filter features & limitations as the Abstract - All Objekts source.",
    ],
    requiresAuth: false,
  },
];

function CosmoIcon() {
  return (
    <Image
      src={CosmoImage.src}
      alt="COSMO"
      width={32}
      height={32}
      className="rounded-full border border-foreground dark:border-transparent"
      quality={100}
      data-icon
    />
  );
}

function AbstractIcon() {
  return (
    <div className="relative size-6 rounded-full bg-[#29E58A]" data-icon>
      <Image src={AbstractImage} alt="Abstract" fill={true} quality={100} />
    </div>
  );
}
