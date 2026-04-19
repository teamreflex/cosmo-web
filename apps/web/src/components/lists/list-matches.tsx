import { m } from "@/i18n/messages";
import { IconUsers } from "@tabler/icons-react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Button } from "../ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet";
import ListMatchesContent, {
  ListMatchesSkeleton,
} from "./list-matches-content";

type Props = {
  listId: string;
  listName: string;
};

export default function ListMatches({ listId, listName }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <IconUsers />
          {m.list_matches_title()}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto data-[side=right]:sm:max-w-2xl gap-0"
      >
        <SheetHeader>
          <SheetTitle>{m.list_matches_title()}</SheetTitle>
          <SheetDescription>
            {m.list_matches_description({ listName })}
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-3 p-4">
          <QueryErrorResetBoundary>
            {({ reset }) => (
              <ErrorBoundary
                onReset={reset}
                fallbackRender={() => (
                  <p className="text-sm text-muted-foreground">
                    {m.list_matches_empty()}
                  </p>
                )}
              >
                <Suspense fallback={<ListMatchesSkeleton />}>
                  <ListMatchesContent listId={listId} />
                </Suspense>
              </ErrorBoundary>
            )}
          </QueryErrorResetBoundary>
        </div>
      </SheetContent>
    </Sheet>
  );
}
