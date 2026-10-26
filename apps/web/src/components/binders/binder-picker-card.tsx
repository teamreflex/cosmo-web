import { pickerCardLabel } from "@/components/objekt-picker/picker-filters";
import { PickerCardFace } from "@/components/objekt-picker/picker-grid";
import { m } from "@/i18n/messages";
import { Objekt } from "@/lib/universal/objekt-conversion";
import { cn } from "@/lib/utils";
import type { CosmoObjekt } from "@apollo/cosmo/types/objekts";
import { useDraggable } from "@dnd-kit/core";
import { IconLock } from "@tabler/icons-react";
import { memo } from "react";

type Props = {
  objekt: CosmoObjekt;
  inBinder: boolean;
  locked: boolean;
  priority: boolean;
  onPick: (objekt: CosmoObjekt) => void;
};

/**
 * What an objekt dragged out of the picker carries to the pocket it's dropped
 * on, under the `drag` key of its dnd-kit data.
 */
export type PickerDragData = { kind: "objekt"; objekt: CosmoObjekt };

/**
 * One pickable objekt in the binder editor: the plain front image, dimmed
 * with an "in binder" label when it's already placed. Placed objekts stay
 * pickable, because picking one moves it to the selected pocket. Cards can
 * also be dragged onto a pocket.
 */
const BinderPickerCard = memo(function BinderPickerCard({
  objekt,
  inBinder,
  locked,
  priority,
  onPick,
}: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `objekt-${objekt.tokenId}`,
    data: {
      drag: { kind: "objekt", objekt } satisfies PickerDragData,
    },
  });
  const { collection, objekt: token } = Objekt.fromLegacy(objekt);

  return (
    <div className="@container">
      <button
        ref={setNodeRef}
        type="button"
        {...attributes}
        {...listeners}
        onClick={() => onPick(objekt)}
        aria-label={[
          pickerCardLabel(collection, token.serial),
          locked ? m.common_locked() : null,
          inBinder ? m.binder_picker_in_binder() : null,
        ]
          .filter((part) => part !== null)
          .join(", ")}
        style={{
          "--objekt-background-color": collection.backgroundColor,
          "--objekt-text-color": collection.textColor,
        }}
        className={cn(
          "relative block aspect-photocard w-full cursor-pointer touch-manipulation overflow-hidden rounded-photocard bg-secondary outline-2 outline-transparent transition-[outline-color,opacity] duration-150 hover:outline-(--objekt-background-color) focus-visible:outline-cosmo",
          isDragging && "opacity-40",
        )}
      >
        <PickerCardFace
          collection={collection}
          serial={token.serial}
          priority={priority}
        />

        {inBinder && (
          <span className="absolute inset-0 flex flex-col justify-end bg-black/60">
            <span className="bg-black/70 py-[3px] text-center text-xxs text-neutral-200">
              {m.binder_picker_in_binder()}
            </span>
          </span>
        )}

        {locked && (
          <span className="absolute top-[4cqw] left-[4cqw] grid size-5 place-items-center rounded-md bg-black/60 text-white">
            <IconLock className="size-3" stroke={2.4} />
          </span>
        )}
      </button>
    </div>
  );
});

export default BinderPickerCard;
