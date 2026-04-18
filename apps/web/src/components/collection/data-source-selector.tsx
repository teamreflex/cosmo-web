import { m } from "@/i18n/messages";
import { env } from "@/lib/env/client";
import type { CollectionDataSource } from "@apollo/util";
import { IconHelpCircle } from "@tabler/icons-react";
import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
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
                <IconHelpCircle className="size-4" />
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
        <AlertDialogAction onClick={props.onClose}>
          {m.common_continue()}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  );
}
