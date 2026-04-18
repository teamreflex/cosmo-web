import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { CosmoFilters, SetCosmoFilters } from "@/hooks/use-cosmo-filters";
import { useProfileContext } from "@/hooks/use-profile";
import { m } from "@/i18n/messages";
import { env } from "@/lib/env/client";
import { cn } from "@/lib/utils";
import type { CollectionDataSource } from "@apollo/util";
import { IconHelpCircle } from "@tabler/icons-react";
import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { getSources } from "./data-sources";
import FilterChip from "./filter-chip";

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
  const target = useProfileContext((state) => state.target);
  const [helpOpen, setHelpOpen] = useState(false);

  const sources = getSources();
  const available = sources.filter((s) =>
    s.isAvailable(target?.cosmo?.address),
  );
  const active = sources.find((s) => s.value === dataSource);

  function handleChange(source: CollectionDataSource) {
    // blockchain sources don't support gridable
    if (
      (source === "blockchain" || source === "blockchain-groups") &&
      filters.gridable
    ) {
      setFilters({ gridable: undefined });
    }
    setDataSource(source);
  }

  return (
    <>
      <FilterChip
        label={m.data_source_title()}
        valueLabel={active?.shortLabel.toLowerCase()}
        width={280}
        align="end"
      >
        {({ close }) => (
          <div className="flex flex-col">
            <div className="flex flex-col py-1">
              {available.map((source) => {
                const selected = source.value === dataSource;
                return (
                  <button
                    key={source.value}
                    type="button"
                    onClick={() => {
                      handleChange(source.value);
                      close();
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2 text-left text-xs transition-colors hover:bg-accent",
                    )}
                  >
                    <div className="shrink-0">{source.icon}</div>
                    <div className="flex min-w-0 flex-col">
                      <span className="font-medium">{source.label}</span>
                      <span className="font-mono text-xxs text-muted-foreground">
                        {source.subtitle}
                      </span>
                    </div>
                    {selected && (
                      <span className="ml-auto font-mono text-[11px] text-cosmo">
                        ●
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="border-t border-border">
              <button
                type="button"
                onClick={() => {
                  close();
                  setHelpOpen(true);
                }}
                className="flex w-full items-center justify-center gap-2 px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <IconHelpCircle className="size-3.5" />
                <span>{m.data_source_what_is_this()}</span>
              </button>
            </div>
          </div>
        )}
      </FilterChip>

      <AlertDialog open={helpOpen} onOpenChange={setHelpOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{m.data_source_title()}</AlertDialogTitle>
            <AlertDialogDescription>
              {m.data_source_description({ appName: env.VITE_APP_NAME })}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <Accordion
            className="flex flex-col text-sm"
            type="single"
            collapsible
          >
            {sources.map((source, i) => (
              <AccordionItem key={i} value={source.value}>
                <AccordionTrigger className="py-2">
                  {source.title}
                </AccordionTrigger>
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
            <AlertDialogAction onClick={() => setHelpOpen(false)}>
              {m.common_continue()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
