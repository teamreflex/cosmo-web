import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { m } from "@/i18n/messages";
import { scrapeCandidatesQuery } from "@/lib/queries/share-data";
import type { ScrapeSelection } from "@/lib/universal/schema/share-data";
import { track } from "@/lib/utils";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import DoneStep from "./done-step";
import GetRecaptcha from "./qr-auth";
import SelectStep from "./select-step";

type State =
  | { step: "select" }
  | { step: "auth"; selection: ScrapeSelection[] }
  | { step: "done"; updated: number };

/**
 * The share-data wizard. The body mounts on the first open and stays mounted,
 * so closing the sheet mid-flow keeps the selection, QR code and OTP input.
 * Closing it after a finished share starts the next open over.
 */
export default function ShareDataSheet() {
  const queryClient = useQueryClient();
  const [opened, setOpened] = useState(false);
  const [state, setState] = useState<State>({ step: "select" });

  return (
    <Sheet
      onOpenChange={(open) => {
        if (open) {
          setOpened(true);
        } else if (state.step === "done") {
          setState({ step: "select" });
        }
      }}
    >
      <SheetTrigger render={<Button />}>{m.common_start()}</SheetTrigger>
      <SheetContent
        keepMounted={opened}
        className="gap-0 overflow-y-auto sm:max-w-md"
      >
        <SheetHeader className="border-b p-5">
          <SheetTitle>{m.share_data_title()}</SheetTitle>
          <SheetDescription>{m.share_data_explanation()}</SheetDescription>
        </SheetHeader>
        <div className="p-5">
          {state.step === "select" && (
            <Suspense
              fallback={
                <div className="flex flex-col gap-4">
                  <Skeleton className="h-4 w-64" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              }
            >
              <CandidateSelect
                onContinue={(selection) =>
                  setState({ step: "auth", selection })
                }
              />
            </Suspense>
          )}

          {state.step === "auth" && (
            <GetRecaptcha
              selection={state.selection}
              onCancel={() => setState({ step: "select" })}
              onSuccess={(updated) => {
                track("share-data");
                setState({ step: "done", updated });
                void queryClient.invalidateQueries({
                  queryKey: scrapeCandidatesQuery.queryKey,
                });
              }}
            />
          )}

          {state.step === "done" && <DoneStep updated={state.updated} />}
        </div>
      </SheetContent>
    </Sheet>
  );
}

type CandidateSelectProps = {
  onContinue: (selection: ScrapeSelection[]) => void;
};

function CandidateSelect({ onContinue }: CandidateSelectProps) {
  const { data: candidates } = useSuspenseQuery(scrapeCandidatesQuery);

  if (candidates.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {m.share_data_nothing_needed()}
      </p>
    );
  }

  return <SelectStep candidates={candidates} onContinue={onContinue} />;
}
