import { type CSSProperties, forwardRef } from "react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import {
  BFFCollectionGroup,
  BFFCollectionGroupCollection,
} from "@/lib/universal/cosmo/objekts";
import { ObjektSidebar } from "./common";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import FlippableObjekt from "./objekt-flippable";
import { Objekt } from "@/lib/universal/objekt-conversion";
import { X } from "lucide-react";

/**
 * TODO:
 * - Migrate ActionOverlay over to this component
 * - Implement scrolling
 */

interface Props {
  group: BFFCollectionGroup;
  gridColumns: number;
}

/**
 * Shows all objekts in the collection group on click.
 */
export default function GroupedObjekt({ group, gridColumns }: Props) {
  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger asChild>
        <RootObjekt collection={group.collection} count={group.count} />
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content>
          {/* hide the title and description */}
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>
              {group.collection.collectionId}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description>
              Select an objekt
            </DialogPrimitive.Description>
          </VisuallyHidden.Root>

          {/* content */}
          <div className="fixed left-[50%] top-12 z-50 grid w-full max-w-[78rem] translate-x-[-50%] px-2">
            <div className="flex flex-col gap-4">
              {/* title */}
              <div className="grid grid-cols-[1fr_auto] grid-rows-2 grid-flow-col">
                <h2 className="text-2xl font-bold">
                  {group.collection.collectionId}
                </h2>
                <p className="text-sm font-semibold text-muted-foreground">
                  {group.count} objekts
                </p>

                <DialogPrimitive.Close className="place-self-end opacity-70 transition-opacity hover:opacity-100 cursor-pointer disabled:pointer-events-none outline-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                  <X className="size-8" />
                  <span className="sr-only">Close</span>
                </DialogPrimitive.Close>
              </div>

              {/* objekts */}
              <ObjektList group={group} gridColumns={gridColumns} />
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

type RootObjektProps = {
  collection: BFFCollectionGroupCollection;
  count: number;
};

const RootObjekt = forwardRef<HTMLButtonElement, RootObjektProps>(
  ({ collection, count, ...props }, ref) => {
    const style = {
      "--objekt-background-color": collection.backgroundColor,
      "--objekt-text-color": collection.textColor,
    } as CSSProperties;

    return (
      <button
        ref={ref}
        style={style}
        {...props}
        className={cn(
          "relative bg-accent w-full aspect-photocard cursor-pointer object-contain rounded-lg md:rounded-xl lg:rounded-2xl outline-none"
        )}
      >
        <Image
          src={collection.frontImage}
          fill={true}
          alt={collection.collectionId}
        />

        <ObjektSidebar collection={collection.collectionNo} />
        {count > 1 && (
          <span className="absolute bottom-3 left-3 px-2 py-px bg-black text-white rounded-full text-sm font-semibold">
            {count}
          </span>
        )}
      </button>
    );
  }
);
RootObjekt.displayName = "RootObjekt";

function ObjektList({ group, gridColumns }: Props) {
  const style = {
    "--grid-columns": gridColumns,
  } as CSSProperties;

  return (
    <div
      style={style}
      className="grid grid-cols-3 md:grid-cols-[repeat(var(--grid-columns),_minmax(0,_1fr))] gap-2"
    >
      {group.objekts.map((objekt) => {
        const common = Objekt.fromCollectionGroup({
          collection: group.collection,
          objekt: objekt,
        });
        return (
          <FlippableObjekt key={objekt.metadata.tokenId} objekt={common}>
            <ObjektSidebar
              collection={group.collection.collectionNo}
              serial={objekt.metadata.objektNo}
            />
          </FlippableObjekt>
        );
      })}
    </div>
  );
}
