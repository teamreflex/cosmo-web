import { m } from "@/i18n/messages";
import type { PublicUser } from "@/lib/universal/auth";
import { cn } from "@/lib/utils";
import type { ObjektList } from "@apollo/database/web/types";
import { IconList } from "@tabler/icons-react";
import { ClientOnly } from "@tanstack/react-router";
import { format } from "date-fns";
import type { ReactNode } from "react";
import { Skeleton } from "../ui/skeleton";
import DeleteList from "./delete-list";
import ListContacts from "./list-contacts";
import UpdateList from "./update-list";

type Props = {
  list: ObjektList;
  ownerName: string;
  owner: PublicUser | undefined;
  isOwner: boolean;
  extras?: ReactNode;
};

export default function ListHeader({
  list,
  ownerName,
  owner,
  isOwner,
  extras,
}: Props) {
  const intent = intentCopy(list.type);

  return (
    <div className="flex min-h-40 flex-col py-4">
      <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
        <div className="flex items-start gap-4">
          {/* intent mark */}
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border font-mono text-xl font-black md:h-14 md:w-14 md:text-2xl",
              intent.mark,
            )}
            title={intent.label}
          >
            {intent.glyph}
          </div>

          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs lowercase">
              <span className={cn("font-semibold", intent.labelColor)}>
                {intent.label}
              </span>
              {list.createdAt && (
                <>
                  <span className="text-muted-foreground">·</span>
                  {/* the date is in the viewer's timezone */}
                  <ClientOnly
                    fallback={<Skeleton className="h-3 w-24 rounded-full" />}
                  >
                    <span className="text-muted-foreground">
                      {m.list_header_created({
                        date: format(list.createdAt, "d MMM yy"),
                      })}
                    </span>
                  </ClientOnly>
                </>
              )}
              <span className="text-muted-foreground">·</span>
              <div id="list-total-stat" />
            </div>

            <h1 className="font-cosmo text-2xl leading-none font-black tracking-wide wrap-break-word uppercase md:text-3xl">
              {list.name}
              {list.type === "sale" && list.currency && (
                <span className="ml-2 text-sm text-muted-foreground">
                  ({list.currency})
                </span>
              )}
            </h1>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {extras}
          {isOwner && (
            <>
              <UpdateList objektList={list} />
              <DeleteList objektList={list} />
            </>
          )}
        </div>
      </div>

      <div className="mt-4 grid flex-1 gap-4 md:grid-cols-[1fr_auto]">
        <div className={cn("border-l-2 pl-4", intent.borderColor)}>
          {list.description ? (
            <p className="max-w-[62ch] text-sm leading-relaxed whitespace-pre-wrap text-foreground">
              {list.description}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              {m.list_header_description_empty()}
            </p>
          )}
        </div>

        <div className="md:min-w-[320px] md:empty:hidden">
          <ListContacts ownerName={ownerName} user={owner} />
        </div>
      </div>
    </div>
  );
}

function intentCopy(type: ObjektList["type"]) {
  switch (type) {
    case "want":
      return {
        label: m.list_header_intent_want(),
        glyph: "◎",
        mark: "border-amber-500/50 bg-amber-500/10 text-amber-500",
        labelColor: "text-amber-500",
        borderColor: "border-amber-500/60",
      } as const;
    case "have":
      return {
        label: m.list_header_intent_have(),
        glyph: "◆",
        mark: "border-teal-500/50 bg-teal-500/10 text-teal-500",
        labelColor: "text-teal-500",
        borderColor: "border-teal-500/60",
      } as const;
    case "sale":
      return {
        label: m.list_header_intent_sale(),
        glyph: "$",
        mark: "border-border bg-muted text-foreground",
        labelColor: "text-foreground",
        borderColor: "border-border",
      } as const;
    case "regular":
    default:
      return {
        label: m.list_header_intent_regular(),
        glyph: <IconList className="size-5 md:size-7" />,
        mark: "border-border bg-muted text-foreground",
        labelColor: "text-foreground",
        borderColor: "border-border",
      } as const;
  }
}
