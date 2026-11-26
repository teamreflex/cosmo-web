import ConfirmActionDialog from "@/components/confirm-action-dialog";
import ObjektPicker from "@/components/objekt-picker/objekt-picker";
import { ObjektCardFace } from "@/components/objekt/common";
import { Button } from "@/components/ui/button";
import { useProfileLocks } from "@/hooks/use-profile";
import { m } from "@/i18n/messages";
import { formatError } from "@/lib/client/errors";
import { getObjektFrontImageUrl } from "@/lib/client/objekt-util";
import { $removeProfileImage, $setProfileImage } from "@/lib/functions/avatar";
import type { Objekt } from "@/lib/universal/objekt-conversion";
import { cn } from "@/lib/utils";
import { type AvatarCrop, USER_AVATAR_MAX_ZOOM } from "@apollo/image";
import { formatSerial } from "@apollo/util";
import {
  IconChevronLeft,
  IconLoader2,
  IconTrash,
  IconZoomIn,
  IconZoomOut,
} from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { memo, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { toast } from "sonner";

type Props = {
  /** the owner's COSMO address, whose collection the picker lists */
  address: string;
  /** the owner's name, which the preview shows beside the picture */
  username: string;
  /** the owner has a picture, which the trash button removes */
  hasPicture: boolean;
  /** once the picture is stored or removed */
  onSaved: () => Promise<void>;
};

/**
 * Picks one of the owner's objekts, then crops their profile picture out of
 * its front image, filling the `SheetFill` around it. The picker stays
 * mounted under the cropper, so going back finds its filters and scroll
 * position as they were.
 */
export default function AvatarEditor({
  address,
  username,
  hasPicture,
  onSaved,
}: Props) {
  const locks = useProfileLocks();
  const [picked, setPicked] = useState<Objekt.Objekt | null>(null);

  return (
    <>
      <div className="flex min-h-12 shrink-0 items-center gap-2 border-b border-border px-4 py-1.5 text-sm text-muted-foreground md:px-5">
        <p className="min-w-0 flex-1">
          {picked === null
            ? m.profile_avatar_pick_hint()
            : m.profile_avatar_crop_hint()}
        </p>
        {hasPicture && <RemoveButton onRemoved={onSaved} />}
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          inert={picked !== null}
          className={cn(
            "flex min-h-0 flex-1 flex-col",
            picked !== null && "invisible",
          )}
        >
          <ObjektPicker
            address={address}
            lockedTokenIds={new Set(locks)}
            className="min-h-0 flex-1"
            renderCard={(objekt, { priority }) => (
              <PickerCard
                objekt={objekt}
                priority={priority}
                onPick={setPicked}
              />
            )}
          />
        </div>

        {picked !== null && (
          <AvatarCropper
            key={picked.objekt.tokenId}
            objekt={picked}
            username={username}
            onBack={() => setPicked(null)}
            onSaved={onSaved}
          />
        )}
      </div>
    </>
  );
}

/**
 * One of the owner's objekts in the picker. Picking it opens the cropper on
 * its front image.
 */
const PickerCard = memo(function PickerCard({
  objekt,
  priority,
  onPick,
}: {
  objekt: Objekt.Objekt;
  priority: boolean;
  onPick: (objekt: Objekt.Objekt) => void;
}) {
  const { collection } = objekt;

  return (
    <div className="@container">
      <button
        type="button"
        aria-label={`${collection.member} ${collection.collectionNo} ${formatSerial(objekt.objekt.serial)}`}
        onClick={() => onPick(objekt)}
        style={{ "--objekt-background-color": collection.backgroundColor }}
        className="relative block aspect-photocard w-full cursor-pointer touch-manipulation overflow-hidden rounded-photocard bg-secondary outline-2 -outline-offset-2 outline-transparent transition-[outline-color] duration-150 hover:outline-(--objekt-background-color) focus-visible:outline-offset-2 focus-visible:outline-cosmo"
      >
        <ObjektCardFace
          collection={collection}
          serial={objekt.objekt.serial}
          priority={priority}
        />
      </button>
    </div>
  );
});

/**
 * The cropper reports its area in percentages of the image as floats, which
 * can land a hair outside it.
 */
function toAvatarCrop(area: Area): AvatarCrop {
  const fraction = (percent: number) => Math.min(Math.max(percent / 100, 0), 1);
  return {
    x: fraction(area.x),
    y: fraction(area.y),
    size: fraction(area.width),
  };
}

/**
 * The picked objekt under a fixed circle: dragging moves the image and a
 * pinch, the wheel or the slider zooms it. Only the circle's place in the
 * image is sent; the server crops its own copy.
 */
function AvatarCropper({
  objekt,
  username,
  onBack,
  onSaved,
}: {
  objekt: Objekt.Objekt;
  username: string;
  onBack: () => void;
  onSaved: () => Promise<void>;
}) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const image = getObjektFrontImageUrl(objekt.collection, "grid");

  const mutation = useMutation({
    mutationFn: (crop: AvatarCrop) =>
      $setProfileImage({
        data: { tokenId: objekt.objekt.tokenId, crop },
      }),
    onSuccess: async () => {
      toast.success(m.profile_avatar_saved());
      await onSaved();
    },
    onError: (error) => toast.error(formatError(error)),
  });

  return (
    <div className="absolute inset-0 flex flex-col">
      <div className="relative min-h-0 flex-1 bg-black/30">
        <Cropper
          image={image}
          crop={position}
          zoom={zoom}
          aspect={1}
          // oxlint-disable-next-line anti-slop/no-shape-in-symbol-names -- react-easy-crop's prop
          cropShape="round"
          showGrid={false}
          maxZoom={USER_AVATAR_MAX_ZOOM}
          onCropChange={setPosition}
          onZoomChange={setZoom}
          onCropAreaChange={setArea}
          mediaProps={{
            alt: `${objekt.collection.member} ${objekt.collection.collectionNo}`,
          }}
        />
      </div>
      <div className="shrink-0 border-t border-border px-4 md:px-5">
        <div className="mx-auto flex max-w-xl items-center gap-3 text-muted-foreground">
          <IconZoomOut className="size-4.5 shrink-0" />
          <input
            type="range"
            aria-label={m.profile_avatar_zoom()}
            min={1}
            max={USER_AVATAR_MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(event) => setZoom(event.target.valueAsNumber)}
            className="h-11 min-w-0 flex-1 cursor-pointer accent-cosmo"
          />
          <IconZoomIn className="size-4.5 shrink-0" />
        </div>
      </div>

      <footer className="flex shrink-0 items-center gap-2 border-t border-border px-4 py-3 md:px-5 md:py-3.5">
        {/* the picture at the size a trade page shows it, then as a feed row names its poster */}
        <div
          role="img"
          aria-label={m.profile_avatar_preview()}
          className="mr-auto flex min-w-0 items-center gap-3"
        >
          <CropPreview image={image} area={area} className="size-10" />
          <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
            <CropPreview image={image} area={area} className="size-6" />
            <span className="hidden truncate sm:inline">{username}</span>
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={mutation.isPending}
          onClick={onBack}
        >
          <IconChevronLeft />
          {m.common_back()}
        </Button>
        <Button
          type="button"
          disabled={area === null || mutation.isPending}
          onClick={() => {
            if (area !== null) {
              mutation.mutate(toAvatarCrop(area));
            }
          }}
        >
          {mutation.isPending && <IconLoader2 className="animate-spin" />}
          {m.common_save()}
        </Button>
      </footer>
    </div>
  );
}

/**
 * Removes the owner's picture once they confirm, which puts the squid back.
 */
function RemoveButton({ onRemoved }: { onRemoved: () => Promise<void> }) {
  const mutation = useMutation({
    mutationFn: () => $removeProfileImage(),
    onSuccess: async () => {
      toast.success(m.profile_avatar_removed());
      await onRemoved();
    },
    onError: (error) => toast.error(formatError(error)),
  });

  return (
    <ConfirmActionDialog
      title={m.profile_avatar_remove_title()}
      description={m.profile_avatar_remove_description()}
      confirmLabel={m.common_remove()}
      variant="destructive"
      mutation={mutation}
      trigger={
        <Button
          type="button"
          variant="destructive"
          size="icon"
          aria-label={m.profile_avatar_remove()}
          title={m.profile_avatar_remove()}
        >
          <IconTrash />
        </Button>
      }
    />
  );
}

/**
 * The crop as it will show in a circle of one size, drawn by placing the
 * whole image behind the circle rather than cropping anything.
 */
function CropPreview({
  image,
  area,
  className,
}: {
  image: string;
  area: Area | null;
  className: string;
}) {
  return (
    <span
      className={cn(
        "relative block shrink-0 overflow-hidden rounded-full bg-muted",
        className,
      )}
    >
      {area !== null && (
        <img
          src={image}
          alt=""
          className="absolute max-w-none"
          style={{
            width: `${10000 / area.width}%`,
            left: `${(-100 * area.x) / area.width}%`,
            top: `${(-100 * area.y) / area.height}%`,
          }}
        />
      )}
    </span>
  );
}
