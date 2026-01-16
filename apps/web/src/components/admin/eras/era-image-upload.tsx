import { Button } from "@/components/ui/button";
import { m } from "@/i18n/messages";
import { IconPhoto, IconX } from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";

type Props = {
  existingUrl?: string;
  onFileSelect: (file: File | null) => void;
  onClear: () => void;
};

const MAX_SIZE = 1024 * 1024; // 1MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export default function EraImageUpload({
  existingUrl,
  onFileSelect,
  onClear,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      if (preview && preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setError(null);

    if (!file) {
      setPreview(null);
      onFileSelect(null);
      return;
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError(m.admin_era_image_invalid_type());
      return;
    }

    if (file.size > MAX_SIZE) {
      setError(m.admin_era_image_too_large());
      return;
    }

    // Create preview
    const url = URL.createObjectURL(file);
    setPreview(url);
    onFileSelect(file);
  }

  function handleClear() {
    if (preview && preview.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    setError(null);
    onFileSelect(null);
    onClear();
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  const displayUrl = preview || existingUrl;

  return (
    <div className="flex flex-col gap-2">
      {displayUrl ? (
        <div className="relative inline-block">
          <img
            src={displayUrl}
            alt="Era image preview"
            className="size-24 rounded-md object-cover"
          />
          <Button
            type="button"
            variant="secondary"
            size="icon"
            className="absolute -top-2 -right-2 size-6"
            onClick={handleClear}
          >
            <IconX className="size-3" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-fit"
          onClick={() => inputRef.current?.click()}
        >
          <IconPhoto className="size-4" />
          <span>{m.admin_era_image_select()}</span>
        </Button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        onChange={handleFileChange}
        className="hidden"
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <p className="text-xs text-muted-foreground">
        {m.admin_era_image_hint()}
      </p>
    </div>
  );
}
