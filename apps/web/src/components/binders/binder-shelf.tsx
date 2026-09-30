import ShelfRow from "@/components/profile/shelf-row";
import { Skeleton } from "@/components/ui/skeleton";
import { m } from "@/i18n/messages";
import { binderShelfQuery } from "@/lib/queries/binders";
import { MAX_BINDERS } from "@/lib/universal/binders";
import { IconPlus } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import BinderCover from "./binder-cover";
import BinderViewerLink from "./binder-viewer-link";
import CreateBinderDialog from "./create-binder-dialog";

type Props = {
  /** the route param, so the editor link uses the identifier the profile was opened with */
  username: string;
  displayName: string;
  /** address-only profiles have no user, and so no binders */
  userId: string | undefined;
  isOwner: boolean;
  /** the binder whose editor is open */
  activeSlug: string | undefined;
};

/**
 * Shared by the covers, the New binder tile and the skeleton. It's a
 * container so photocard radii resolve against the tile, as they do inside
 * the cover.
 */
const tileClassName =
  "@container flex w-21.5 flex-none flex-col gap-1.5 md:w-24";

export default function BinderShelf(props: Props) {
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
            {m.binder_shelf_error()}
          </p>
        </ShelfRow>
      }
    >
      <Suspense fallback={<ShelfSkeleton />}>
        <BinderShelfContent {...props} userId={props.userId} />
      </Suspense>
    </ErrorBoundary>
  );
}

function BinderShelfContent({
  username,
  displayName,
  userId,
  isOwner,
  activeSlug,
}: Props & { userId: string }) {
  const { data: binders } = useSuspenseQuery(binderShelfQuery(userId));
  const [createOpen, setCreateOpen] = useState(false);

  if (binders.length === 0 && !isOwner) {
    return (
      <ShelfRow>
        <EmptyMessage displayName={displayName} />
      </ShelfRow>
    );
  }

  return (
    <ShelfRow>
      {binders.map((binder) => (
        <div
          key={binder.id}
          data-active={binder.slug === activeSlug}
          className={tileClassName}
        >
          <BinderViewerLink
            binder={binder}
            className="transition-transform duration-250 hover:-translate-y-0.75 hover:-rotate-[0.6deg] in-data-[active=true]:ring-2 in-data-[active=true]:ring-cosmo in-data-[active=true]:ring-offset-2 in-data-[active=true]:ring-offset-background motion-reduce:transition-none"
          >
            <BinderCover binder={binder} />
          </BinderViewerLink>
        </div>
      ))}

      {isOwner && (
        <>
          <NewBinderTile
            full={binders.length >= MAX_BINDERS}
            onClick={() => setCreateOpen(true)}
          />
          <CreateBinderDialog
            username={username}
            open={createOpen}
            onOpenChange={setCreateOpen}
          />
        </>
      )}
    </ShelfRow>
  );
}

function EmptyMessage({ displayName }: { displayName: string }) {
  return (
    <p className="text-sm text-muted-foreground">
      {m.binder_shelf_empty({ username: displayName })}
    </p>
  );
}

/**
 * A dashed cover at the end of the owner's shelf. At the binder cap it stays
 * in place, disabled, and says why.
 */
function NewBinderTile({
  full,
  onClick,
}: {
  full: boolean;
  onClick: () => void;
}) {
  return (
    <div className={tileClassName}>
      <button
        type="button"
        disabled={full}
        onClick={onClick}
        className="flex aspect-photocard flex-col items-center justify-center gap-1 rounded-l-[2.4cqi] rounded-r-photocard border-[1.5px] border-dashed border-foreground/20 px-2 text-center text-xs text-muted-foreground transition-colors outline-none focus-visible:border-cosmo enabled:hover:border-foreground/40 enabled:hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
      >
        <IconPlus className="size-5" />
        {m.binder_new()}
      </button>
      {full && (
        <span className="text-[11px] text-muted-foreground">
          {m.binder_shelf_limit({ max: MAX_BINDERS })}
        </span>
      )}
    </div>
  );
}

function ShelfSkeleton() {
  return (
    <ShelfRow>
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className={tileClassName}>
          <Skeleton className="aspect-photocard rounded-l-[2.4cqi] rounded-r-photocard" />
        </div>
      ))}
    </ShelfRow>
  );
}
