import { useState } from "react";
import { CircleHelp } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import { Button } from "../ui/button";
import type { ReactNode } from "react";
import type { CollectionDataSource } from "@/lib/utils";
import { Addresses, isEqual } from "@/lib/utils";
import { m } from "@/i18n/messages";
import { env } from "@/lib/env/client";

type Props = {
  name: string;
  value?: CollectionDataSource;
  defaultValue?: CollectionDataSource;
  onValueChange?: (value: CollectionDataSource) => void;
  targetCosmo?: string;
};

export function DataSourceSelector(props: Props) {
  const [helpOpen, setHelpOpen] = useState(false);
  const sources = getSources();

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

          <SelectSeparator />

          <div className="flex w-full justify-center">
            <Button variant="link" size="xs" onClick={() => setHelpOpen(true)}>
              <div className="flex flex-row items-center gap-2 text-xs">
                <CircleHelp className="size-4" />
                <span>{m.data_source_what_is_this()}</span>
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
  const sources = getSources();
  return (
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{m.data_source_title()}</AlertDialogTitle>
        <AlertDialogDescription>
          {m.data_source_description({ appName: env.VITE_APP_NAME })}
        </AlertDialogDescription>
      </AlertDialogHeader>

      <Accordion className="flex flex-col text-sm" type="single" collapsible>
        {sources.map((source, i) => (
          <AccordionItem key={i} value={source.value}>
            <AccordionTrigger className="py-2">{source.title}</AccordionTrigger>
            <AccordionContent className="flex flex-col gap-2">
              <p className="font-semibold">{source.description}</p>
              <ul className="list-inside list-disc">
                {source.notes.map((text, j) => (
                  <li key={j}>{text}</li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <AlertDialogFooter>
        <AlertDialogAction onClick={props.onClose}>{m.common_continue()}</AlertDialogAction>
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
  isAvailable: (address?: string) => boolean;
};

function getSources(): Source[] {
  return [
    {
      title: m.data_source_blockchain_groups_title(),
      subtitle: m.data_source_blockchain_groups_subtitle(),
      label: m.data_source_blockchain_groups_label(),
      shortLabel: m.data_source_blockchain_groups_short(),
      icon: <AbstractIcon />,
      value: "blockchain-groups",
      description: m.data_source_blockchain_groups_desc(),
      notes: [
        m.data_source_blockchain_groups_note_1(),
        m.data_source_blockchain_groups_note_2(),
        m.data_source_blockchain_groups_note_3(),
        m.data_source_blockchain_groups_note_4(),
        m.data_source_blockchain_groups_note_5(),
      ],
      /**
       * prevent collection groups being used on the spin account.
       * the SQL query to pull this off needs optimization.
       */
      isAvailable: (address) => {
        return address !== undefined ? !isEqual(address, Addresses.SPIN) : true;
      },
    },
    {
      title: m.data_source_blockchain_title(),
      subtitle: m.data_source_blockchain_subtitle(),
      label: m.data_source_blockchain_label(),
      shortLabel: m.data_source_blockchain_short(),
      icon: <AbstractIcon />,
      value: "blockchain",
      description: m.data_source_blockchain_desc(),
      notes: [
        m.data_source_blockchain_note_1(),
        m.data_source_blockchain_note_2(),
      ],
      isAvailable: () => true,
    },
  ];
}

function AbstractIcon() {
  return (
    <div className="relative size-6 rounded-full bg-abstract" data-icon>
      <img src="/abstract.svg" alt={m.data_source_blockchain_short()} className="absolute" />
    </div>
  );
}
