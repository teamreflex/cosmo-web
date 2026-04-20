import { useMediaQuery } from "@/hooks/use-media-query";
import { m } from "@/i18n/messages";
import { cn } from "@/lib/utils";
import type { ObjektList } from "@apollo/database/web/types";
import { IconUsers } from "@tabler/icons-react";
import { QueryErrorResetBoundary } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
  DrawerTrigger,
} from "../ui/drawer-radix";
import ListMatchesContent, {
  ListMatchesSkeleton,
} from "./list-matches-content";

type Props = {
  list: ObjektList;
};

export default function ListMatches({ list }: Props) {
  const [open, setOpen] = useState(false);
  const isDesktop = useMediaQuery();

  const trigger = (
    <Button variant="outline" size="sm">
      <IconUsers />
      {m.list_matches_title()}
    </Button>
  );

  const body = (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3 sm:px-5">
        <span className="font-cosmo text-sm font-black tracking-[0.14em] uppercase">
          {m.list_matches_title()}
        </span>
        <span
          className={cn(
            "ml-auto truncate font-mono text-xs",
            list.type === "have" ? "text-teal-500" : "text-amber-500",
          )}
        >
          {m.list_matches_description({ listName: list.name })}
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4">
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
                <ListMatchesContent listId={list.id} />
              </Suspense>
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </div>
    </div>
  );

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent
          showCloseButton={false}
          className="grid h-[50dvh] w-[calc(100%-2rem)] grid-rows-[1fr] gap-0 overflow-hidden rounded-md p-0 sm:max-w-[min(900px,calc(100%-4rem))]"
        >
          <div className="sr-only">
            <DialogTitle>{m.list_matches_title()}</DialogTitle>
            <DialogDescription>
              {m.list_matches_description({ listName: list.name })}
            </DialogDescription>
          </div>
          {body}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent className="h-[92dvh] gap-0 rounded-t-md p-0">
        <div className="sr-only">
          <DrawerTitle>{m.list_matches_title()}</DrawerTitle>
          <DrawerDescription>
            {m.list_matches_description({ listName: list.name })}
          </DrawerDescription>
        </div>
        {body}
      </DrawerContent>
    </Drawer>
  );
}
