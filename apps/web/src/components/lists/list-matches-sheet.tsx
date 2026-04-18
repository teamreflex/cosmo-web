import { m } from "@/i18n/messages";
import { listMatchesQuery } from "@/lib/queries/objekt-queries";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "../ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet";
import { Skeleton } from "../ui/skeleton";

type Props = {
  listId: string;
  listType: "have" | "want";
};

export default function ListMatchesSheet({ listId }: Props) {
  const [open, setOpen] = useState(false);
  const { data, isPending, isError } = useQuery({
    ...listMatchesQuery(listId),
    enabled: open,
  });

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          {m.list_matches_view()}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{m.list_matches_title()}</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-3 p-4">
          {isPending && open && (
            <>
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </>
          )}
          {isError && (
            <p className="text-sm text-muted-foreground">
              {m.list_matches_empty()}
            </p>
          )}
          {data && data.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {m.list_matches_empty()}
            </p>
          )}
          {data?.map((partner) => (
            <article
              key={partner.theirUserId}
              className="flex flex-col gap-2 rounded-lg border p-4"
            >
              <header className="flex items-baseline justify-between">
                <h4 className="font-semibold">
                  {partner.theirUsername ?? partner.theirUserId.slice(0, 8)}
                </h4>
                <span className="text-xs text-muted-foreground">
                  {m.list_matches_overlap_count({
                    count: partner.theyHaveIWant.length,
                  })}
                </span>
              </header>

              <section>
                <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                  they have / you want
                </p>
                <ul className="flex flex-wrap gap-1">
                  {partner.theyHaveIWant.slice(0, 12).map((slug) => (
                    <li
                      key={slug}
                      className="rounded bg-muted px-2 py-0.5 text-xs"
                    >
                      {slug}
                    </li>
                  ))}
                  {partner.theyHaveIWant.length > 12 && (
                    <li className="text-xs text-muted-foreground">
                      +{partner.theyHaveIWant.length - 12}
                    </li>
                  )}
                </ul>
              </section>

              <section>
                <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                  you have / they want
                </p>
                <ul className="flex flex-wrap gap-1">
                  {partner.iHaveTheyWant.slice(0, 12).map((slug) => (
                    <li
                      key={slug}
                      className="rounded bg-muted px-2 py-0.5 text-xs"
                    >
                      {slug}
                    </li>
                  ))}
                  {partner.iHaveTheyWant.length > 12 && (
                    <li className="text-xs text-muted-foreground">
                      +{partner.iHaveTheyWant.length - 12}
                    </li>
                  )}
                </ul>
              </section>

              {partner.descriptions.length > 0 && (
                <p className="line-clamp-3 text-xs text-muted-foreground">
                  {partner.descriptions.join(" • ")}
                </p>
              )}
            </article>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
