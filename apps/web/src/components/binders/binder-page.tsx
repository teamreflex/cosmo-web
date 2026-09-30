import { ObjektSidebar } from "@/components/objekt/common";
import { getObjektFrontImageUrl } from "@/lib/client/objekt-util";
import { binderGrid } from "@/lib/universal/binders";
import type { BinderLayout } from "@/lib/universal/binders";
import { Objekt } from "@/lib/universal/objekt-conversion";
import { cn } from "@/lib/utils";
import type { CosmoObjekt } from "@apollo/cosmo/types/objekts";
import type { ComponentProps } from "react";

type BinderPageProps = ComponentProps<"div"> & {
  layout: BinderLayout;
};

/**
 * One binder page: the paper and its grid of pockets, laid out by the
 * binder's layout. Shared by the editor and the viewer.
 */
export function BinderPage({
  layout,
  className,
  children,
  ...props
}: BinderPageProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-linear-to-b from-foreground/[0.07] to-foreground/[0.04] p-2.5 md:p-4.5",
        className,
      )}
      {...props}
    >
      <div
        className="grid gap-2 md:gap-2.5"
        style={{
          gridTemplateColumns: `repeat(${binderGrid(layout).columns}, minmax(0, 1fr))`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

type PocketSleeveProps = {
  objekt: CosmoObjekt | undefined;
  /** load the image eagerly, for the first page on screen */
  priority?: boolean;
  className?: string;
};

/**
 * A pocket drawn as a translucent sleeve with a sheen across it, so an empty
 * pocket still reads as a pocket. Empty sleeves show a faint diagonal weave.
 */
export function PocketSleeve({
  objekt,
  priority = false,
  className,
}: PocketSleeveProps) {
  return (
    <div className={cn("@container", className)}>
      <div
        className={cn(
          "relative aspect-photocard overflow-hidden rounded-photocard border border-foreground/7 bg-foreground/[0.035] after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:bg-[linear-gradient(160deg,rgb(255_255_255/0.10),transparent_35%,transparent_65%,rgb(255_255_255/0.04))]",
          objekt === undefined &&
            "before:absolute before:inset-0 before:bg-[repeating-linear-gradient(135deg,transparent_0_6px,rgb(255_255_255/0.025)_6px_7px)]",
        )}
      >
        {objekt !== undefined && (
          <PocketObjekt objekt={objekt} priority={priority} />
        )}
      </div>
    </div>
  );
}

function PocketObjekt({
  objekt,
  priority,
}: {
  objekt: CosmoObjekt;
  priority: boolean;
}) {
  const { collection, objekt: token } = Objekt.fromLegacy(objekt);

  return (
    <div
      style={{
        "--objekt-background-color": collection.backgroundColor,
        "--objekt-text-color": collection.textColor,
      }}
      className="absolute inset-0"
    >
      <img
        src={getObjektFrontImageUrl(collection, "xs")}
        alt={collection.collectionId}
        width={291}
        height={450}
        decoding="async"
        fetchPriority={priority ? "high" : "auto"}
        className="size-full object-cover"
      />
      <ObjektSidebar collection={collection} serial={token.serial} />
    </div>
  );
}
