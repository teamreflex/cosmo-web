import { Clipboard, HardDriveUpload, Loader2, Plus, Trash } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { saveBandUrls } from "./actions";
import type { BandUrlRow } from "@/lib/universal/schema/admin";
import { bandUrlInputSchema } from "@/lib/universal/schema/admin";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function InsertBands() {
  const [items, setItems] = useState<BandUrlRow[]>([
    { slug: "", bandImageUrl: "" },
  ]);
  const mutationFn = useServerFn(saveBandUrls);
  const mutation = useMutation({
    mutationFn,
    onSuccess: () => {
      toast.success(`${items.length} objekt bands updated`);
      setItems([{ slug: "", bandImageUrl: "" }]);
    },
    onError: () => {
      toast.error("An unknown error occurred");
    },
  });

  const hasRows =
    items.length > 0 &&
    items.some((r) => r.slug.length > 0 && r.bandImageUrl.length > 0);

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
      })
    );
  }

  async function onPaste() {
    const data = await navigator.clipboard.readText();
    const result = bandUrlInputSchema.safeParse(data);
    if (result.success === false) {
      toast.error(
        "Invalid format: Required format is 'collectionId :: bandImageUrl'"
      );
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
        <h1 className="text-lg font-semibold">Insert Bands</h1>
        <Button size="xs" onClick={addRow}>
          <Plus className="size-4" /> <span>Add Row</span>
        </Button>
        <Button size="xs" onClick={onPaste}>
          <Clipboard className="size-4" /> <span>Fill</span>
        </Button>
        <Button
          variant="cosmo"
          size="xs"
          onClick={() => mutation.mutate({ data: items })}
          disabled={mutation.isPending || !hasRows}
        >
          {mutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <HardDriveUpload className="size-4" />
          )}{" "}
          <span>Save</span>
        </Button>
      </div>

      {/* rows */}
      <div className="flex flex-col gap-2">
        {items.map((row, index) => (
          <div key={index} className="grid grid-cols-[20%_70%_auto] gap-2">
            <Input
              id="slug"
              placeholder="atom01-heejin-101z..."
              value={row.slug}
              onChange={(e) => update(index, "slug", e.currentTarget.value)}
            />

            <Input
              id="bandImageUrl"
              placeholder="https://resources.cosmo.fans/..."
              value={row.bandImageUrl}
              onChange={(e) =>
                update(index, "bandImageUrl", e.currentTarget.value)
              }
            />

            <Button variant="destructive" onClick={() => removeRow(index)}>
              <Trash />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
