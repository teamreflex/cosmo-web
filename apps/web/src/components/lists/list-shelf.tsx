import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { m } from "@/i18n/messages";
import { getObjektFrontImageUrl } from "@/lib/client/objekt-util";
import { listShelfQuery } from "@/lib/queries/lists";
import type { ListShelfItem } from "@/lib/universal/lists";
import { cn } from "@/lib/utils";
import { IconLetterCase, IconList, IconPlus } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { type ReactNode, Suspense, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import CreateListDialog from "./create-list-dialog";
import DiscordFormatDialog from "./discord-format-dialog";

type Props = {
  /** the route param, so tiles link under the same identifier the profile was opened with */
  username: string;
  displayName: string;
  /** address-only profiles have no user, and so no lists */
  userId: string | undefined;
  isOwner: boolean;
  activeSlug: string | undefined;
};

export default function ListShelf(props: Props) {
  if (props.userId === undefined) {
    return (
      <ShelfRow>
        <EmptyMessage displayName={props.displayName} />
      </ShelfRow>
    );
  }

  return (
    <ErrorBoundary
      fallback={
        <ShelfRow>
          <p className="text-sm text-muted-foreground">
            {m.list_shelf_error()}
          </p>
        </ShelfRow>
      }
    >
      <Suspense fallback={<ShelfSkeleton />}>
        <ListShelfContent {...props} userId={props.userId} />
      </Suspense>
    </ErrorBoundary>
  );
}

function ListShelfContent({
  username,
  displayName,
  userId,
  isOwner,
  activeSlug,
}: Props & { userId: string }) {
  const { data: lists } = useSuspenseQuery(listShelfQuery(userId));
  const [createOpen, setCreateOpen] = useState(false);
  const [discordOpen, setDiscordOpen] = useState(false);

  if (lists.length === 0 && !isOwner) {
    return (
      <ShelfRow>
        <EmptyMessage displayName={displayName} />
      </ShelfRow>
    );
  }

  return (
    <ShelfRow>
      {lists.map((list) => (
        <Link
          key={list.id}
          to="/@{$username}/list/$slug"
          params={{ username, slug: list.slug }}
          data-active={list.slug === activeSlug}
          className="group flex w-33 flex-none flex-col gap-1.5 outline-none"
        >
          <div className="relative h-20 rounded-lg border border-border bg-card transition-colors group-hover:border-foreground/20 group-focus-visible:border-cosmo group-data-[active=true]:border-cosmo">
            <ListPill list={list} />
            <CardFan list={list} />
          </div>
          <span className="text-xs leading-snug font-semibold wrap-anywhere">
            {list.name}
          </span>
        </Link>
      ))}

      {isOwner && (
        <>
          <ActionTile
            icon={<IconPlus className="size-5" />}
            label={m.list_new()}
            onClick={() => setCreateOpen(true)}
          />
          {lists.length > 0 && (
            <ActionTile
              icon={<IconLetterCase className="size-5" />}
              label={m.list_discord_format()}
              onClick={() => setDiscordOpen(true)}
            />
          )}

          <CreateListDialog
            objektLists={lists}
            open={createOpen}
            onOpenChange={setCreateOpen}
          />
          <DiscordFormatDialog
            objektLists={lists}
            open={discordOpen}
            onOpenChange={setDiscordOpen}
          />
        </>
      )}
    </ShelfRow>
  );
}

/**
 * Wraps onto new rows from md up, and scrolls sideways on a phone like the
 * member filter.
 */
function ShelfRow({ children }: { children: ReactNode }) {
  return (
    <div className="container no-scrollbar flex gap-x-3 gap-y-3.5 overflow-x-auto py-3.5 md:flex-wrap md:overflow-visible">
      {children}
    </div>
  );
}

function EmptyMessage({ displayName }: { displayName: string }) {
  return (
    <p className="text-sm text-muted-foreground">
      {m.list_shelf_empty({ username: displayName })}
    </p>
  );
}

/**
 * Sits in the corner of the fan so the list name underneath can wrap freely.
 */
function ListPill({ list }: { list: ListShelfItem }) {
  const className =
    "absolute top-1.5 left-1.5 z-10 h-4 px-1.5 text-[10px] shadow-md";

  switch (list.type) {
    case "have":
      return (
        <Badge variant="list-have" className={className}>
          {m.list_type_have()}
        </Badge>
      );
    case "want":
      return (
        <Badge variant="list-want" className={className}>
          {m.list_type_want()}
        </Badge>
      );
    case "sale":
      return list.currency ? (
        <Badge variant="secondary" className={className}>
          {list.currency}
        </Badge>
      ) : null;
    case "regular":
      return null;
  }
}

/**
 * Card positions within the fan, indexed by how many previews the list has
 * minus one.
 */
const fanLayouts = [
  ["left-12 top-2"],
  ["left-8.5 top-2.5 -rotate-6", "left-15.5 top-2.5 rotate-6"],
  [
    "left-5.5 top-3 -rotate-10",
    "left-12 top-2 z-1",
    "left-18.5 top-3 rotate-10",
  ],
];

function CardFan({ list }: { list: ListShelfItem }) {
  const layout = fanLayouts[list.previews.length - 1];
  if (layout === undefined) {
    return (
      <IconList className="absolute inset-0 m-auto size-5 text-muted-foreground/50" />
    );
  }

  return list.previews.map((preview, i) => (
    <img
      key={preview.slug}
      src={getObjektFrontImageUrl(preview, "xs")}
      alt={preview.collectionId}
      width={36}
      height={56}
      decoding="async"
      className={cn(
        "absolute aspect-photocard w-9 rounded-[3px] object-cover object-top shadow-lg shadow-black/50",
        layout[i],
      )}
    />
  ));
}

function ActionTile({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-33 flex-none flex-col gap-1.5 text-left outline-none"
    >
      <div className="grid h-20 place-items-center rounded-lg border border-dashed border-border text-muted-foreground transition-colors group-hover:border-foreground/20 group-hover:text-foreground group-focus-visible:border-cosmo">
        {icon}
      </div>
      <span className="text-xs leading-snug font-semibold text-muted-foreground">
        {label}
      </span>
    </button>
  );
}

function ShelfSkeleton() {
  return (
    <ShelfRow>
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex w-33 flex-none flex-col gap-1.5">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-3.5 w-20" />
        </div>
      ))}
    </ShelfRow>
  );
}
