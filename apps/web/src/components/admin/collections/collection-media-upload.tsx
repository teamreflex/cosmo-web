import { Button } from "@/components/ui/button";
import { m } from "@/i18n/messages";
import type { UpdateCollectionInput } from "@/lib/universal/schema/collections";
import { cn } from "@/lib/utils";
import { IconVideo, IconX } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";
import { useFormContext } from "react-hook-form";

const ALLOWED_CLASSES = ["Motion", "Double"];

type Props = {
  currentMedia: string | null;
  stagedFile: File | null;
  onFileSelect: (file: File | null) => void;
  objektClass: string;
};

export default function CollectionMediaUpload({
  currentMedia,
  stagedFile,
  onFileSelect,
  objektClass,
}: Props) {
  const form = useFormContext<UpdateCollectionInput>();
  const inputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const enabled = ALLOWED_CLASSES.includes(objektClass);

  // revoke the preview object URL we created on unmount
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  function revokePreview() {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setError(null);

    if (!file) {
      return;
    }

    if (file.type !== "video/mp4") {
      setError(m.admin_collection_media_invalid_type());
      return;
    }

    revokePreview();
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    onFileSelect(file);
    // drive the live preview in the collection display
    form.setValue("frontMedia", url, { shouldDirty: true });
  }

  function handleClear() {
    revokePreview();
    onFileSelect(null);
    // restore the persisted media value and clear the dirty flag
    form.resetField("frontMedia");
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {stagedFile ? (
        <div className="flex items-center gap-2">
          <span className="truncate text-sm">{stagedFile.name}</span>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="size-6 shrink-0"
            onClick={handleClear}
            aria-label={m.aria_clear_image()}
          >
            <IconX className="size-3" />
          </Button>
        </div>
      ) : currentMedia ? (
        <p className="truncate text-xs text-muted-foreground">{currentMedia}</p>
      ) : (
        <p className="text-sm text-muted-foreground">
          {m.admin_collection_media_none()}
        </p>
      )}

      <Button
        type="button"
        variant="outline"
        className={cn("w-fit", stagedFile && "border-cosmo")}
        disabled={!enabled}
        onClick={() => inputRef.current?.click()}
      >
        <IconVideo className="size-4" />
        <span>{m.admin_collection_media_select()}</span>
      </Button>

      <input
        ref={inputRef}
        type="file"
        accept="video/mp4"
        onChange={handleChange}
        className="hidden"
      />

      {!enabled && (
        <p className="text-xs text-muted-foreground">
          {m.admin_collection_media_class_hint()}
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
