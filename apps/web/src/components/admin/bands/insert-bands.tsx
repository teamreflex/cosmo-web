import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { m } from "@/i18n/messages";
import type { BandUrlRow } from "@/lib/universal/schema/admin";
import { bandUrlInputSchema } from "@/lib/universal/schema/admin";
import {
  IconClipboard,
  IconLoader2,
  IconPlus,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { $saveBandUrls } from "./actions";

export default function InsertBands() {
  const [items, setItems] = useState<BandUrlRow[]>([
    { slug: "", bandImageUrl: "" },
  ]);
  const mutation = useMutation({
    mutationFn: $saveBandUrls,
    onSuccess: () => {
      toast.success(m.admin_bands_updated({ count: items.length }));
      setItems([{ slug: "", bandImageUrl: "" }]);
    },
    onError: () => {
      toast.error(m.error_unknown());
    },
  });

  const hasRows = items.some(
    (r) => r.slug.length > 0 && r.bandImageUrl.length > 0,
  );

  function update(index: number, key: keyof BandUrlRow, value: string) {
    setItems((prev) =>
      prev.map((p, i) => {
        if (i === index) {
          return {
            ...p,
            [key]: value,
          };
        }
        return p;
      }),
    );
  }

  async function onPaste() {
    const data = await navigator.clipboard.readText();
    const result = bandUrlInputSchema.safeParse(data);
    if (result.success === false) {
      toast.error(m.admin_bands_invalid_format());
      return;
    }

    setItems(result.data);
  }

  function addRow() {
    setItems((prev) => [
      ...prev,
      {
        slug: "",
        bandImageUrl: "",
      },
    ]);
  }

  function removeRow(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-2">
      {/* header */}
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold">{m.admin_insert_bands()}</h1>
        <Button size="xs" onClick={addRow}>
          <IconPlus className="size-4" /> <span>{m.admin_add_row()}</span>
        </Button>
        <Button size="xs" onClick={onPaste}>
          <IconClipboard className="size-4" /> <span>{m.admin_fill()}</span>
        </Button>
        <Button
          variant="cosmo"
          size="xs"
          onClick={() => mutation.mutate({ data: items })}
          disabled={mutation.isPending || !hasRows}
        >
          {mutation.isPending ? (
            <IconLoader2 className="size-4 animate-spin" />
          ) : (
            <IconUpload className="size-4" />
          )}{" "}
          <span>{m.common_save()}</span>
        </Button>
      </div>

      {/* rows */}
      <div className="flex flex-col gap-2">
        {items.map((row, index) => (
          <div key={index} className="grid grid-cols-[20%_70%_auto] gap-2">
            <Input
              id="slug"
              placeholder={m.admin_collection_id_placeholder()}
              value={row.slug}
              onChange={(e) => update(index, "slug", e.currentTarget.value)}
            />

            <Input
              id="bandImageUrl"
              placeholder={m.admin_band_url_placeholder()}
              value={row.bandImageUrl}
              onChange={(e) =>
                update(index, "bandImageUrl", e.currentTarget.value)
              }
            />

            <Button variant="destructive" onClick={() => removeRow(index)}>
              <IconTrash />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
